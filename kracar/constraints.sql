CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "AvailabilityBlock" ADD CONSTRAINT inventory_no_overlap EXCLUDE USING gist
  ("vehicleId" WITH =, tstzrange("start", "end", '[)') WITH &&);
ALTER TABLE "AvailabilityBlock" ADD CONSTRAINT block_valid_period CHECK ("end" > "start");
ALTER TABLE "Booking" ADD CONSTRAINT booking_valid_period CHECK ("end" > "start");
ALTER TABLE "Booking" ADD CONSTRAINT booking_state CHECK (status IN ('requested','approved','in_progress','completed','declined','cancelled','expired'));
ALTER TABLE "Booking" ADD CONSTRAINT booking_source CHECK (source IN ('marketplace','direct','b2b'));
ALTER TABLE "Vehicle" ADD CONSTRAINT vehicle_amounts CHECK ("dailyRate">0 AND deposit>=0 AND "weeklyDiscount" BETWEEN 0 AND 5000);
ALTER TABLE "Payment" ADD CONSTRAINT payment_amounts CHECK (amount>0 AND refunded>=0 AND refunded<=amount);
ALTER TABLE "FinancialDocument" ADD CONSTRAINT invoice_amounts CHECK (total>=0 AND paid>=0 AND paid<=total AND credited>=0 AND credited<=total);
ALTER TABLE "SecurityDeposit" ADD CONSTRAINT deposit_amounts CHECK (required>=0 AND received>=0 AND retained>=0 AND refunded>=0 AND received<=required AND retained+refunded<=received);
ALTER TABLE "Review" ADD CONSTRAINT review_rating CHECK (rating BETWEEN 1 AND 5);
CREATE FUNCTION prevent_immutable_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Immutable record: create a compensating entry or a new version'; END; $$;
CREATE TRIGGER ledger_immutable BEFORE UPDATE OR DELETE ON "LedgerEntry" FOR EACH ROW EXECUTE FUNCTION prevent_immutable_change();
CREATE TRIGGER contract_version_immutable BEFORE UPDATE OR DELETE ON "ContractVersion" FOR EACH ROW EXECUTE FUNCTION prevent_immutable_change();
CREATE TRIGGER signature_immutable BEFORE UPDATE OR DELETE ON "Signature" FOR EACH ROW EXECUTE FUNCTION prevent_immutable_change();
CREATE FUNCTION ledger_balanced() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT COALESCE(SUM(amount),0) FROM "LedgerEntry" WHERE "eventKey"=NEW."eventKey") <> 0 THEN
    RAISE EXCEPTION 'Ledger event is not balanced';
  END IF;
  RETURN NEW;
END; $$;
CREATE CONSTRAINT TRIGGER ledger_event_balanced AFTER INSERT ON "LedgerEntry" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger_balanced();
CREATE FUNCTION issued_document_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status <> 'draft' AND (NEW.snapshot IS DISTINCT FROM OLD.snapshot OR NEW.total <> OLD.total OR NEW.currency <> OLD.currency OR NEW.kind <> OLD.kind OR NEW."agencyId" <> OLD."agencyId" OR NEW.number IS DISTINCT FROM OLD.number OR NEW.issuer <> OLD.issuer) THEN
    RAISE EXCEPTION 'Issued documents are immutable; issue a credit note';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER document_snapshot_immutable BEFORE UPDATE ON "FinancialDocument" FOR EACH ROW EXECUTE FUNCTION issued_document_immutable();
