import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  proxySources: defineTable({
    name: v.string(),
    url: v.string(),
    token: v.string(),
  }),
});
