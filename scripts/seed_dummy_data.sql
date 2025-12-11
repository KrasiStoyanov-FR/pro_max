-- Seed data for drones (across Bulgaria)
INSERT INTO drones (id, system_id, mac_address, serial_number, uas_id, first_seen, last_seen, is_active) VALUES
  (1, 'SYS01', 'AA:BB:CC:DD:EE:01', 'SOF-DRONE-001', 'UAS-SOF-001', datetime('now', '-4 days'), datetime('now', '-4 minutes'), 1),
  (2, 'SYS02', 'AA:BB:CC:DD:EE:02', 'PLD-DRONE-001', 'UAS-PLD-001', datetime('now', '-3 days'), datetime('now', '-6 minutes'), 1),
  (3, 'SYS03', 'AA:BB:CC:DD:EE:03', 'VAR-DRONE-001', 'UAS-VAR-001', datetime('now', '-2 days'), datetime('now', '-12 minutes'), 1),
  (4, 'SYS04', 'AA:BB:CC:DD:EE:04', 'BURG-DRONE-001', 'UAS-BURG-001', datetime('now', '-1 days'), datetime('now', '-20 minutes'), 1),
  (5, 'SYS05', 'AA:BB:CC:DD:EE:05', 'RUS-DRONE-001', 'UAS-RUS-001', datetime('now', '-5 days'), datetime('now', '-40 minutes'), 0);

-- Seed data for drone_positions (trajectories across the country)
INSERT INTO drone_positions (id, system_id, drone_id, time, latitude, longitude, altitude, speed, receiver_type) VALUES
  -- Sofia
  (1001, 'SYS01', 1, datetime('now', '-18 minutes'), 42.703100, 23.319500, 150.0, 38.0, 'radar'),
  (1002, 'SYS01', 1, datetime('now', '-12 minutes'), 42.701200, 23.325800, 155.0, 42.0, 'radar'),
  (1003, 'SYS01', 1, datetime('now', '-6 minutes'),  42.698200, 23.332000, 148.5, 35.5, 'radar'),
  -- Plovdiv
  (1101, 'SYS02', 2, datetime('now', '-20 minutes'), 42.140500, 24.731000, 120.0, 30.0, 'rf'),
  (1102, 'SYS02', 2, datetime('now', '-10 minutes'), 42.137800, 24.742300, 125.0, 28.0, 'rf'),
  (1103, 'SYS02', 2, datetime('now', '-4 minutes'),  42.133900, 24.753100, 118.5, 33.5, 'rf'),
  -- Varna
  (1201, 'SYS03', 3, datetime('now', '-40 minutes'), 43.219900, 27.910200, 90.0, 22.0, 'radar'),
  (1202, 'SYS03', 3, datetime('now', '-30 minutes'), 43.217300, 27.919400, 95.0, 26.0, 'radar'),
  (1203, 'SYS03', 3, datetime('now', '-15 minutes'), 43.212700, 27.927600, 88.5, 21.5, 'radar'),
  -- Burgas
  (1301, 'SYS04', 4, datetime('now', '-25 minutes'), 42.510200, 27.457800, 60.0, 18.0, 'rf'),
  (1302, 'SYS04', 4, datetime('now', '-15 minutes'), 42.508000, 27.468100, 65.0, 20.0, 'rf'),
  (1303, 'SYS04', 4, datetime('now', '-5 minutes'),  42.504300, 27.479500, 58.5, 17.5, 'rf'),
  -- Ruse (inactive drone but historical path)
  (1401, 'SYS05', 5, datetime('now', '-2 hours'), 43.842000, 25.962500, 30.0, 10.0, 'radar'),
  (1402, 'SYS05', 5, datetime('now', '-90 minutes'), 43.838500, 25.969000, 28.0, 9.0, 'radar'),
  (1403, 'SYS05', 5, datetime('now', '-60 minutes'), 43.834900, 25.976200, 25.5, 8.0, 'radar');

-- Seed data for operator_positions (spread across regions)
INSERT INTO operator_positions (id, system_id, drone_id, time, latitude, longitude) VALUES
  (2001, 'SYS01', 1, datetime('now', '-5 minutes'), 42.696800, 23.315500),
  (2002, 'SYS01', 1, datetime('now', '-25 minutes'), 42.694000, 23.338000),
  (2003, 'SYS02', 2, datetime('now', '-8 minutes'), 42.140200, 24.733800),
  (2004, 'SYS02', 2, datetime('now', '-28 minutes'), 42.132500, 24.757400),
  (2005, 'SYS03', 3, datetime('now', '-35 minutes'), 43.214500, 27.913800),
  (2006, 'SYS04', 4, datetime('now', '-12 minutes'), 42.507200, 27.463100),
  (2007, 'SYS05', 5, datetime('now', '-70 minutes'), 43.836600, 25.967800);

-- Seed data for rf_detections (multiple detections per drone)
INSERT INTO rf_detections (id, time, detection_status, signal_strength, frequency, drone_id, system_id) VALUES
  -- Sofia drone tracked by detector SYS01
  (3001, datetime('now', '-18 minutes'), 1, -38.5, 2.410, 1, 'SYS01'),
  (3002, datetime('now', '-14 minutes'), 1, -40.0, 2.420, 1, 'SYS01'),
  (3003, datetime('now', '-10 minutes'), 1, -42.3, 2.435, 1, 'SYS01'),
  (3004, datetime('now', '-6 minutes'),  1, -41.2, 2.460, 1, 'SYS01'),
  -- Plovdiv drone tracked by detector SYS02
  (3010, datetime('now', '-22 minutes'), 1, -48.0, 5.800, 2, 'SYS02'),
  (3011, datetime('now', '-16 minutes'), 1, -47.5, 5.805, 2, 'SYS02'),
  (3012, datetime('now', '-8 minutes'),  1, -46.0, 5.810, 2, 'SYS02'),
  (3013, datetime('now', '-3 minutes'),  1, -44.8, 5.815, 2, 'SYS02'),
  -- Varna drone tracked by detector SYS03
  (3020, datetime('now', '-50 minutes'), 1, -55.0, 2.430, 3, 'SYS03'),
  (3021, datetime('now', '-35 minutes'), 1, -53.5, 2.435, 3, 'SYS03'),
  (3022, datetime('now', '-20 minutes'), 1, -52.0, 2.445, 3, 'SYS03'),
  -- Burgas drone tracked by detector SYS04
  (3030, datetime('now', '-18 minutes'), 1, -60.0, 5.600, 4, 'SYS04'),
  (3031, datetime('now', '-12 minutes'), 1, -59.0, 5.605, 4, 'SYS04'),
  (3032, datetime('now', '-6 minutes'),  1, -57.5, 5.610, 4, 'SYS04'),
  -- Legacy detections for inactive drone
  (3040, datetime('now', '-90 minutes'), 0, -75.0, 2.420, 5, 'SYS05');

-- Seed data for receiver_logs (detector health)
INSERT INTO receiver_logs (id, system_id, receiver_type, status, time, message) VALUES
  (4001, 'SYS01', 'radar', 'online', datetime('now', '-8 minutes'), 'Sofia detector tracking active drone.'),
  (4002, 'SYS02', 'rf', 'online', datetime('now', '-5 minutes'), 'Plovdiv RF array locked on target.'),
  (4003, 'SYS03', 'radar', 'online', datetime('now', '-25 minutes'), 'Varna detector recalibrated.'),
  (4004, 'SYS04', 'rf', 'online', datetime('now', '-15 minutes'), 'Burgas RF system nominal.'),
  (4005, 'SYS05', 'radar', 'maintenance', datetime('now', '-1 days'), 'Ruse detector awaiting maintenance.');

-- Seed data for gps_unit_position (detectors across BG)
INSERT INTO gps_unit_position (id, unit_id, system_id, name, status, time, latitude, longitude) VALUES
  (5001, 101, 'SYS01', 'Sofia North Radar', 'online', datetime('now', '-5 minutes'), 42.705500, 23.323600),
  (5002, 102, 'SYS02', 'Plovdiv RF Array', 'online', datetime('now', '-3 minutes'), 42.138900, 24.748900),
  (5003, 103, 'SYS03', 'Varna Coastal Radar', 'online', datetime('now', '-20 minutes'), 43.216500, 27.918300),
  (5004, 104, 'SYS04', 'Burgas Harbor RF', 'online', datetime('now', '-10 minutes'), 42.506200, 27.470800),
  (5005, 105, 'SYS05', 'Ruse Danube Radar', 'offline', datetime('now', '-1 days'), 43.840100, 25.970200);

