//IDs of the resources as per https://en.wikipedia.org/wiki/List_of_DNS_record_types
// prettier-ignore
export enum RecordType {
  'A' = 1,           //RFC 1035[1]	Address record	Returns a 32-bit IPv4 address, most commonly used to map hostnames to an IP address of the host, but it is also used for DNSBLs, storing subnet masks in RFC 1101, etc.
  'AAAA' = 28,       //RFC 3596[2]	IPv6 address record	Returns a 128-bit IPv6 address, most commonly used to map hostnames to an IP address of the host.
  'AFSDB' = 18,      //RFC 1183	AFS database record	Location of database servers of an AFS cell. This record is commonly used by AFS clients to contact AFS cells outside their local domain. A subtype of this record is used by the obsolete DCE/DFS file system.
  'APL' = 42,        //RFC 3123	Address Prefix List	Specify lists of address ranges, e.g. in CIDR format, for various address families. Experimental.
  'CAA' = 257,       //RFC 6844	Certification Authority Authorization	DNS Certification Authority Authorization, constraining acceptable CAs for a host/domain
  'CDNSKEY' = 60,    //RFC 7344		Child copy of DNSKEY record, for transfer to parent
  'CDS' = 59,        //RFC 7344	Child DS	Child copy of DS record, for transfer to parent
  'CERT' = 37,       //RFC 4398	Certificate record	Stores PKIX, SPKI, PGP, etc.
  'CNAME' = 5,       //RFC 1035[1]	Canonical name record	Alias of one name to another: the DNS lookup will continue by retrying the lookup with the new name.
  'CSYNC' = 62,      //RFC 7477	Child-to-Parent Synchronization	Specify a synchronization mechanism between a child and a parent DNS zone. Typical example is declaring the same NS records in the parent and the child zone
  'DHCID' = 49,      //RFC 4701	DHCP identifier	Used in conjunction with the FQDN option to DHCP
  'DLV' = 32769,     //RFC 4431	DNSSEC Lookaside Validation record	For publishing DNSSEC trust anchors outside of the DNS delegation chain. Uses the same format as the DS record. RFC 5074 describes a way of using these records.
  'DNAME' = 39,      //RFC 6672	Delegation name record	Alias for a name and all its subnames, unlike CNAME, which is an alias for only the exact name. Like a CNAME record, the DNS lookup will continue by retrying the lookup with the new name.
  'DNSKEY' = 48,     //RFC 4034	DNS Key record	The key record used in DNSSEC. Uses the same format as the KEY record.
  'DS' = 43,         //RFC 4034	Delegation signer	The record used to identify the DNSSEC signing key of a delegated zone
  'EUI48' = 108,     //RFC 7043	MAC address (EUI-48)	A 48-bit IEEE Extended Unique Identifier.
  'EUI64' = 109,     //RFC 7043	MAC address (EUI-64)	A 64-bit IEEE Extended Unique Identifier.
  'HINFO' = 13,      //RFC 8482	Host Information	Providing Minimal-Sized Responses to DNS Queries That Have QTYPE=ANY
  'HIP' = 55,        //RFC 8005	Host Identity Protocol	Method of separating the end-point identifier and locator roles of IP addresses.
  'HTTPS' = 65,      //IETF Draft	HTTPS Binding	RR that improves performance for clients that need to resolve many resources to access a domain. More info in this IETF Draft by DNSOP Working group and Akamai technologies.
  'IPSECKEY' = 45,   //RFC 4025	IPsec Key	Key record that can be used with IPsec
  'KEY' = 25,        //RFC 2535[3] and RFC 2930[4]	Key record	Used only for SIG(0) (RFC 2931) and TKEY (RFC 2930).[5] RFC 3445 eliminated their use for application keys and limited their use to DNSSEC.[6] RFC 3755 designates DNSKEY as the replacement within DNSSEC.[7] RFC 4025 designates IPSECKEY as the replacement for use with IPsec.[8]
  'KX' = 29,         //RFC 1876	Location record	Specifies a geographical location associated with a domain name
  'MX' = 15,         //RFC 1035[1] and RFC 7505	Mail exchange record	Maps a domain name to a list of message transfer agents for that domain
  'NAPTR' = 35,      //RFC 3403	Naming Authority Pointer	Allows regular-expression-based rewriting of domain names which can then be used as URIs, further domain names to lookups, etc.
  'NS' = 2,          //RFC 1035[1]	Name server record	Delegates a DNS zone to use the given authoritative name servers
  'NSEC' = 47,       //RFC 4034	Next Secure record	Part of DNSSEC—used to prove a name does not exist. Uses the same format as the (obsolete) NXT record.
  'NSEC3' = 50,      //RFC 5155	Next Secure record version 3	An extension to DNSSEC that allows proof of nonexistence for a name without permitting zonewalking
  'NSEC3PARAM' = 51, //RFC 5155	NSEC3 parameters	Parameter record for use with NSEC3
  'OPENPGPKEY' = 61, //RFC 7929	OpenPGP public key record	A DNS-based Authentication of Named Entities (DANE) method for publishing and locating OpenPGP public keys in DNS for a specific email address using an OPENPGPKEY DNS resource record.
  'PTR' = 12,        //RFC 1035[1]	PTR Resource Record [de]	Pointer to a canonical name. Unlike a CNAME, DNS processing stops and just the name is returned. The most common use is for implementing reverse DNS lookups, but other uses include such things as DNS-SD.
  'RRSIG' = 46,      //RFC 4034	DNSSEC signature	Signature for a DNSSEC-secured record set. Uses the same format as the SIG record.
  'RP' = 17,         //RFC 1183	Responsible Person	Information about the responsible person(s) for the domain. Usually an email address with the @ replaced by a .
  'SIG' = 24,        //RFC 2535	Signature	Signature record used in SIG(0) (RFC 2931) and TKEY (RFC 2930).[7] RFC 3755 designated RRSIG as the replacement for SIG for use within DNSSEC.[7]
  'SMIMEA' = 53,     //RFC 8162[9]	S/MIME cert association[10]	Associates an S/MIME certificate with a domain name for sender authentication.
  'SOA' = 6,         //RFC 1035[1] and RFC 2308[11]	Start of [a zone of] authority record	Specifies authoritative information about a DNS zone, including the primary name server, the email of the domain administrator, the domain serial number, and several timers relating to refreshing the zone.
  'SRV' = 33,        //RFC 2782	Service locator	Generalized service location record, used for newer protocols instead of creating protocol-specific records such as MX.
  'SSHFP' = 44,      //RFC 4255	SSH Public Key Fingerprint	Resource record for publishing SSH public host key fingerprints in the DNS System, in order to aid in verifying the authenticity of the host. RFC 6594 defines ECC SSH keys and SHA-256 hashes. See the IANA SSHFP RR parameters registry for details.
  'SVCB' = 64,       //IETF Draft	Service Binding	RR that improves performance for clients that need to resolve many resources to access a domain. More info in this IETF Draft by DNSOP Working group and Akamai technologies.
  'TA' = 32768,      //N/A	DNSSEC Trust Authorities	Part of a deployment proposal for DNSSEC without a signed DNS root. See the IANA database and Weiler Spec for details. Uses the same format as the DS record.
  'TKEY' = 249,      //RFC 2930	Transaction Key record	A method of providing keying material to be used with TSIG that is encrypted under the public key in an accompanying KEY RR.[12]
  'TLSA' = 52,       //RFC 6698	TLSA certificate association	A record for DANE. RFC 6698 defines "The TLSA DNS resource record is used to associate a TLS server certificate or public key with the domain name where the record is found, thus forming a 'TLSA certificate association'".
  'TSIG' = 250,      //RFC 2845	Transaction Signature	Can be used to authenticate dynamic updates as coming from an approved client, or to authenticate responses as coming from an approved recursive name server[13] similar to DNSSEC.
  'TXT' = 16,        //RFC 1035[1]	Text record	Originally for arbitrary human-readable text in a DNS record. Since the early 1990s, however, this record more often carries machine-readable data, such as specified by RFC 1464, opportunistic encryption, Sender Policy Framework, DKIM, DMARC, DNS-SD, etc.
  'URI' = 256,       //RFC 7553	Uniform Resource Identifier	Can be used for publishing mappings from hostnames to URIs.
  'ZONEMD' = 63,     //RFC 8976	Message Digests for DNS Zones	Provides a cryptographic message digest over DNS zone data at rest.
  '*'=255,	       //RFC 1035[1]	All cached records	Returns all records of all types known to the name server. If the name server does not have any information on the name, the request will be forwarded on. The records returned may not be complete. For example, if there is both an A and an MX for a name, but the name server has only the A record cached, only the A record will be returned. Usually referred to as ANY (e.g., in dig, Windows nslookup, and Wireshark). In 2019, RFC8482 [14] standards-track publication led many DNS providers, including Cloudflare,[15] to provide only minimal responses to "ANY" queries, instead of enumerating records.
  'AXFR'=252,	       //RFC 1035[1]	Authoritative Zone Transfer	Transfer entire zone file from the primary name server to secondary name servers.
  'IXFR'=251,	       //RFC 1996	Incremental Zone Transfer	Requests a zone transfer of the given zone but only differences from a previous serial number. This request may be ignored and a full (AXFR) sent in response if the authoritative server is unable to fulfill the request due to configuration or lack of required deltas.
  'OPT'=41,	       //RFC 6891	Option	This is a pseudo-record type needed to support EDNS.
}
