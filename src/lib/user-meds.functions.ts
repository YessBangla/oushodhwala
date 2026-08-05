import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import * as server from "./user-meds.server";

export const syncUserMedicines = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { favIds: string[]; recentIds: string[] }) => d)
  .handler(async ({ data, context }) => {
    return server.syncMedicines(context.userId, data.favIds, data.recentIds);
  });

export const getUserMedicines = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const favorites = await server.getFavorites(context.userId);
    const recent = await server.getRecent(context.userId);
    return { favorites, recent };
  });

export const toggleUserFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId: string }) => d)
  .handler(async ({ data, context }) => {
    return server.toggleFavorite(context.userId, data.productId);
  });

export const addUserRecent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId: string }) => d)
  .handler(async ({ data, context }) => {
    await server.addRecent(context.userId, data.productId);
    return { success: true };
  });

export const bulkRemoveUserFavorites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[] }) => d)
  .handler(async ({ data, context }) => {
    await server.bulkRemoveFavorites(context.userId, data.ids);
    return { success: true };
  });

export const bulkRemoveUserRecent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[] }) => d)
  .handler(async ({ data, context }) => {
    await server.bulkRemoveRecent(context.userId, data.ids);
    return { success: true };
  });

export const updateMedicineReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId: string; config: any }) => d)
  .handler(async ({ data, context }) => {
    await server.updateReminder(context.userId, data.productId, data.config);
    return { success: true };
  });

export const updateUserMedicineOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productIds: string[] }) => d)
  .handler(async ({ data, context }) => {
    await server.updateSortOrder(context.userId, data.productIds);
    return { success: true };
  });

export const getUserAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return server.getAuditLogs(context.userId);
  });
