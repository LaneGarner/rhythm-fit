import CoreBluetooth
import ExpoModulesCore

public final class RogueTimerModule: Module {
  private let remote = RogueTimerRemote()

  public func definition() -> ModuleDefinition {
    Name("RogueTimer")
    Events("onTimerChoices", "onCountUpStarted")
    OnStartObserving {
      self.remote.onCountUpStarted = { [weak self] request, startedAt, resumed in
        self?.sendEvent("onCountUpStarted", [
          "request": request, "startedAt": startedAt, "resumed": resumed
        ])
      }
      self.remote.onChoices = { [weak self] choices in
        self?.sendEvent("onTimerChoices", ["devices": choices])
      }
    }
    AsyncFunction("selectTimer") { (id: String) in
      self.remote.selectTimer(id)
    }.runOnQueue(.main)
    AsyncFunction("forgetTimer") {
      self.remote.forgetTimer()
    }.runOnQueue(.main)
    AsyncFunction("setWorkoutTimer") { (deadline: Double?, countUp: Bool) in
      self.remote.setWorkoutTimer(deadline, countUp: countUp)
    }.runOnQueue(.main)
    AsyncFunction("syncWorkoutTimer") { (deadline: Double?, countUpRequest: Double?, paused: Bool) in
      self.remote.setWorkoutTimer(deadline, countUp: countUpRequest != nil,
                                 countUpRequest: countUpRequest, paused: paused)
    }.runOnQueue(.main)
  }
}

private final class RogueTimerRemote: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate {
  private let serviceID = CBUUID(string: "FFE0")
  private let commandID = CBUUID(string: "FFE1")
  private let savedKey = "Rhythm.workoutTimerID"
  private var candidates: [CBPeripheral] = []
  private var scanning = false
  var onChoices: (([[String: String]]) -> Void)?
  private var central: CBCentralManager?
  private var timer: CBPeripheral?
  private var command: CBCharacteristic?
  private var deadline: Double?
  private var countdownStartAt: Double?
  var onCountUpStarted: ((Double, Double, Bool) -> Void)?
  private var countUp = false
  private var countUpRequest: Double?
  private var paused = false
  private var wallCountUpRunning = false
  private var wallCountUpPaused = false
  private var startingCountUp: (request: Double, startedAt: Double, resumed: Bool)?
  private var keys: [UInt8] = []
  private var generation = 0
  private var awaitingResponse = false
  private var readyToWrite = true

  func setWorkoutTimer(_ deadline: Double?, countUp: Bool, countUpRequest: Double? = nil, paused: Bool = false) {
    generation += 1
    self.deadline = deadline
    self.countUp = countUp
    self.countUpRequest = countUpRequest
    self.paused = paused
    keys.removeAll()
    central?.stopScan()
    candidates.removeAll()
    scanning = false
    if command != nil {
      // Exit first so a restart always begins from the clock screen.
      prepareKeys()
      sendNext()
      return
    }
    guard countUp || deadline != nil else {
      disconnect()
      return
    }
    if central == nil {
      central = CBCentralManager(delegate: self, queue: .main)
    } else if let central {
      centralManagerDidUpdateState(central)
    }

  }

  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    guard central.state == .poweredOn else {
      disconnect()
      return
    }
    guard countUp || deadline != nil, timer == nil, !scanning else { return }
    scanning = true
    let request = generation
    central.scanForPeripherals(withServices: nil)
    DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
      guard let self, self.generation == request, self.scanning else { return }
      self.scanning = false
      central.stopScan()
      if let saved = UserDefaults.standard.string(forKey: self.savedKey) {
        self.selectTimer(saved)
      } else if self.candidates.count == 1, let only = self.candidates.first {
        self.selectTimer(only.identifier.uuidString)
      } else if self.candidates.count > 1 {
        self.onChoices?(self.candidates.map {
          ["id": $0.identifier.uuidString, "name": $0.name ?? "Workout timer"]
        })
      }
    }
  }

  func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral,
                      advertisementData: [String: Any], rssi: NSNumber) {
    let name = advertisementData[CBAdvertisementDataLocalNameKey] as? String ?? peripheral.name
    guard scanning, name == "Rogue Home Timer 2.0",
          !candidates.contains(where: { $0.identifier == peripheral.identifier }) else { return }
    candidates.append(peripheral)
  }

  func selectTimer(_ id: String) {
    guard let central, timer == nil,
          countUp || (deadline ?? 0) > Date().timeIntervalSince1970 * 1000,
          let selected = candidates.first(where: { $0.identifier.uuidString == id }) else { return }
    candidates.removeAll()
    timer = selected
    central.connect(selected)
    let request = generation
    DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in
      guard let self, self.generation == request, self.timer === selected, self.command == nil else { return }
      self.disconnect()
    }
  }

  func forgetTimer() {
    UserDefaults.standard.removeObject(forKey: savedKey)
    setWorkoutTimer(nil, countUp: false)
  }

  func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
    guard peripheral === timer else { return }
    peripheral.delegate = self
    peripheral.discoverServices([serviceID])
  }

  func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
    guard peripheral === timer else { return }
    guard error == nil, let service = peripheral.services?.first(where: { $0.uuid == serviceID }) else {
      disconnect()
      return
    }
    peripheral.discoverCharacteristics([commandID], for: service)
  }

  func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
    guard peripheral === timer else { return }
    guard error == nil, let characteristic = service.characteristics?.first(where: {
      $0.uuid == commandID && $0.properties.contains(.write)
    }) else {
      disconnect()
      return
    }
    UserDefaults.standard.set(peripheral.identifier.uuidString, forKey: savedKey)
    command = characteristic
    prepareKeys()
    sendNext()
  }

  private func prepareKeys() {
    keys = [0x11]
    countdownStartAt = nil
    if paused {
      keys = wallCountUpRunning ? [0x0c] : (wallCountUpPaused ? [] : [0x11])
      return
    }
    if countUp {
      if wallCountUpPaused {
        keys = [0x0c]
        return
      }
      // Select count-up, reset its elapsed time, then start.
      keys += [0x0d, 0x0a, 0x0c]
      return
    }
    guard let deadline else { return }
    // Leave time for the setup writes, then send Start on Rhythm’s second boundary.
    let availableSeconds = (deadline - Date().timeIntervalSince1970 * 1000) / 1000
    let remaining = max(floor(availableSeconds - 3.2), ceil(availableSeconds - 2.8) > 0 ? 1 : 0)
    guard remaining >= 1, remaining <= 5999 else { return }
    countdownStartAt = deadline - remaining * 1000
    let seconds = Int(remaining)
    let digits = [seconds / 600, seconds / 60 % 10, seconds % 60 / 10, seconds % 10]
    keys += [0x0e, 0x12] + digits.map { 0x13 + UInt8($0) } + [0x12, 0x0c]
  }

  private func sendNext() {
    guard readyToWrite, !awaitingResponse, let timer, let command, !keys.isEmpty else { return }
    if keys.first == 0x0c, let countdownStartAt {
      let delay = (countdownStartAt - Date().timeIntervalSince1970 * 1000) / 1000
      if delay > 0 {
        let request = generation
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
          guard let self, self.generation == request else { return }
          self.sendNext()
        }
        return
      }
    }
    let key = keys.removeFirst()
    if key == 0x0c, let deadline, deadline <= Date().timeIntervalSince1970 * 1000 {
      keys = [0x11]
      sendNext()
      return
    }
    if key == 0x11 {
      wallCountUpRunning = false
      wallCountUpPaused = false
    } else if key == 0x0c {
      if paused {
        wallCountUpRunning = false
        wallCountUpPaused = true
      } else if countUp {
        if let countUpRequest {
          startingCountUp = (countUpRequest, Date().timeIntervalSince1970 * 1000, wallCountUpPaused)
        }
        wallCountUpRunning = true
        wallCountUpPaused = false
      }
    }
    awaitingResponse = true
    timer.writeValue(Data([0x55, 0xaa, 0x01, key]), for: command, type: .withResponse)
  }

  func peripheral(_ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic, error: Error?) {
    guard peripheral === timer, characteristic === command else { return }
    awaitingResponse = false
    guard error == nil else {
      disconnect()
      return
    }
    if let start = startingCountUp {
      startingCountUp = nil
      if start.request == countUpRequest {
        onCountUpStarted?(start.request, start.startedAt, start.resumed)
      }
    }
    readyToWrite = false
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { [weak self] in
      self?.readyToWrite = true
      self?.sendNext()
    }
  }

  func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
    guard peripheral === timer else { return }
    disconnect()
  }

  func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
    guard peripheral === timer else { return }
    disconnect()
  }

  private func disconnect() {
    central?.stopScan()
    scanning = false
    candidates.removeAll()
    if let timer { central?.cancelPeripheralConnection(timer) }
    timer = nil
    command = nil
    wallCountUpRunning = false
    wallCountUpPaused = false
    startingCountUp = nil
    keys.removeAll()
    awaitingResponse = false
    readyToWrite = true
  }
}
