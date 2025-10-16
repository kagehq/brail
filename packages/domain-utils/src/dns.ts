import { promises as dns } from 'dns';

/**
 * Check if a string is a valid FQDN (Fully Qualified Domain Name)
 */
export function isFQDN(hostname: string): boolean {
  const pattern = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
  return pattern.test(hostname) && hostname.length <= 255;
}

/**
 * Split a hostname into root domain and subdomain
 * @example toRootAndHost('www.example.com') => { root: 'example.com', host: 'www' }
 */
export function toRootAndHost(hostname: string): { root: string; host: string } {
  const parts = hostname.split('.');
  
  if (parts.length <= 2) {
    return {
      root: hostname,
      host: '@',
    };
  }

  const root = parts.slice(-2).join('.');
  const host = parts.slice(0, -2).join('.');

  return { root, host: host || '@' };
}

/**
 * Build CNAME instruction for DNS setup
 */
export function buildCnameInstruction(hostname: string, target: string): {
  type: 'CNAME';
  host: string;
  target: string;
  ttl: number;
} {
  const { host } = toRootAndHost(hostname);

  return {
    type: 'CNAME',
    host,
    target,
    ttl: 3600,
  };
}

/**
 * Verify that a hostname has a CNAME pointing to the expected target
 */
export async function verifyCNAME(
  hostname: string,
  expectedTarget: string
): Promise<{ ok: boolean; found: string[] }> {
  try {
    const records = await dns.resolveCname(hostname);
    
    // Normalize targets (remove trailing dots)
    const normalizedExpected = expectedTarget.replace(/\.$/, '');
    const normalizedRecords = records.map(r => r.replace(/\.$/, ''));

    const ok = normalizedRecords.some(record => 
      record === normalizedExpected || record.endsWith(`.${normalizedExpected}`)
    );

    return {
      ok,
      found: normalizedRecords,
    };
  } catch (error: any) {
    // DNS errors mean the CNAME doesn't exist or isn't set up correctly
    return {
      ok: false,
      found: [],
    };
  }
}

/**
 * Resolve all IPs for a hostname (A + AAAA records)
 */
export async function resolveIPs(hostname: string): Promise<string[]> {
  const ips: string[] = [];

  try {
    const a = await dns.resolve4(hostname);
    ips.push(...a);
  } catch {
    // Ignore A record errors
  }

  try {
    const aaaa = await dns.resolve6(hostname);
    ips.push(...aaaa);
  } catch {
    // Ignore AAAA record errors
  }

  return ips;
}

