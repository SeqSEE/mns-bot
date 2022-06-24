// Encoding types as per https://github.com/ethereum/EIPs/blob/master/EIPS/eip-205.md
// prettier-ignore
export enum EncodingType {
  'JSON' = 1,      //JSON
  'ZLIB_JSON' = 2, //zlib-compressed JSON
  'CBOR' = 4,      //CBOR
  'URI' = 8,       //URI
}
