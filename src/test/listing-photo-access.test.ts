import { describe, expect, it } from "vitest";
import { approvedPhotoPaths } from "@/lib/listing-photo-access";

describe("Public listing photo authorization", () => {
  const path = "owner/listing/photo.jpg";
  it("allows a photo attached to an approved owner listing", () => {
    expect(approvedPhotoPaths([path], [{ owner_id: "owner", photos: [path], status: "approved" }])).toEqual([path]);
  });
  it.each(["pending", "rejected"])("denies %s listing photos", status => {
    expect(approvedPhotoPaths([path], [{ owner_id: "owner", photos: [path], status }])).toEqual([]);
  });
  it("denies unattached private uploads", () => {
    expect(approvedPhotoPaths(["owner/private.jpg"], [{ owner_id: "owner", photos: [path], status: "approved" }])).toEqual([]);
  });
  it("denies another owner's path referenced by an approved listing", () => {
    expect(approvedPhotoPaths([path], [{ owner_id: "attacker", photos: [path], status: "approved" }])).toEqual([]);
  });
  it("denies traversal", () => {
    expect(approvedPhotoPaths(["owner/../private.jpg"], [{ owner_id: "owner", photos: ["owner/../private.jpg"], status: "approved" }])).toEqual([]);
  });
});