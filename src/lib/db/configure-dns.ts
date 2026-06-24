import dns from "dns";

// Local DNS proxies (e.g. Docker Desktop on Windows) often refuse SRV lookups
// required by mongodb+srv:// connection strings.
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
