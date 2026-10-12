CREATE TABLE notification_commands (
 store_id TEXT NOT NULL, event_id TEXT NOT NULL, transport_ref TEXT NOT NULL,
 message_json TEXT NOT NULL, message_hash TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(store_id,event_id),
 FOREIGN KEY(store_id,event_id) REFERENCES customer_notifications(store_id,event_id)
);
CREATE TRIGGER notification_command_immutable BEFORE UPDATE ON notification_commands
BEGIN
 SELECT RAISE(ABORT,'notification_command_immutable');
END;
CREATE TRIGGER notification_command_no_delete BEFORE DELETE ON notification_commands
BEGIN
 SELECT RAISE(ABORT,'notification_command_immutable');
END;
