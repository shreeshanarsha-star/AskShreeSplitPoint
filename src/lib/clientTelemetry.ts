// Utility to extract client IP and approximate location from request headers
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((ip) => ip.trim());
    if (ips[0]) return ips[0];
  }
  const realIp = headers.get("x-real-ip") || headers.get("cf-connecting-ip") || headers.get("true-client-ip");
  if (realIp) return realIp.trim();

  return "127.0.0.1";
}

export function getClientLocation(headers: Headers): string {
  const city = headers.get("x-vercel-ip-city") || headers.get("cf-ipcity");
  const region = headers.get("x-vercel-ip-country-region") || headers.get("cf-region");
  const country = headers.get("x-vercel-ip-country") || headers.get("cf-ipcountry");

  const parts = [city, region, country].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(", ");
  }

  return "Location detected via IP";
}
