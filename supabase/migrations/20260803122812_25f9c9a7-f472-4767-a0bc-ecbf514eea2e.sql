DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['products','delivery_zones','branches','suppliers','purchase_orders','chart_accounts','expenses','user_roles','riders','categories','offers','app_settings','stock_transfers']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_erp_audit_%1$s ON public.%1$I', t);
    EXECUTE format('CREATE TRIGGER trg_erp_audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.erp_audit()', t);
  END LOOP;
END $$;