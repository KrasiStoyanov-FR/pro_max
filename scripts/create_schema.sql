PRAGMA foreign_keys = ON;

-- Table: drones
CREATE TABLE IF NOT EXISTS drones (
  system_id      VARCHAR(5),
  id             INTEGER PRIMARY KEY,
  mac_address    VARCHAR(17),
  serial_number  VARCHAR(100),
  uas_id         VARCHAR(100),
  first_seen     TIMESTAMP,
  last_seen      TIMESTAMP,
  is_active      TINYINT
);

-- Table: drone_positions
CREATE TABLE IF NOT EXISTS drone_positions (
  id             INTEGER PRIMARY KEY,
  system_id      VARCHAR(11),
  drone_id       INTEGER,
  time           TIMESTAMP,
  latitude       DECIMAL(10, 8),
  longitude      DECIMAL(11, 8),
  altitude       DECIMAL(8, 2),
  speed          DECIMAL(5, 2),
  receiver_type  VARCHAR(20)
);

-- Table: operator_positions
CREATE TABLE IF NOT EXISTS operator_positions (
  id         INTEGER PRIMARY KEY,
  system_id  VARCHAR(5),
  drone_id   INTEGER,
  time       TIMESTAMP,
  latitude   DECIMAL(10, 8),
  longitude  DECIMAL(11, 8)
);

-- Table: rf_detections
CREATE TABLE IF NOT EXISTS rf_detections (
  id                INTEGER PRIMARY KEY,
  time              TIMESTAMP,
  detection_status  TINYINT,
  signal_strength   DECIMAL(8, 2),
  frequency         DECIMAL(10, 2),
  drone_id          INTEGER,
  system_id         VARCHAR(5)
);

-- Table: receiver_logs
CREATE TABLE IF NOT EXISTS receiver_logs (
  id             INTEGER PRIMARY KEY,
  system_id      VARCHAR(5),
  receiver_type  VARCHAR(20),
  status         VARCHAR(20),
  time           TIMESTAMP,
  message        TEXT
);

-- Table: gps_unit_position (detectors)
CREATE TABLE IF NOT EXISTS gps_unit_position (
  id         INTEGER PRIMARY KEY,
  unit_id    INTEGER,
  system_id  VARCHAR(5),
  name       VARCHAR(100),
  status     VARCHAR(20),
  time       TIMESTAMP,
  latitude   DECIMAL(10, 8),
  longitude  DECIMAL(11, 8)
);

