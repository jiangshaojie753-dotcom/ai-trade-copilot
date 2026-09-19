import { describe, expect, it } from "vitest";
import { assertPublicHttpUrl } from "./website-research";

describe("public website research safety", () => {
  it("allows public HTTP pages and blocks local/private targets", () => {
    expect(() => assertPublicHttpUrl("https://example.com")).not.toThrow();
    expect(() => assertPublicHttpUrl("http://127.0.0.1/admin")).toThrow(/Private network/);
    expect(() => assertPublicHttpUrl("file:///etc/passwd")).toThrow(/HTTP/);
  });
});
