# Operation parity with CyberChef

Generated, not hand-maintained — run `npm run parity` after adding an operation.
The checklist is CyberChef's own `src/core/config/Categories.json`, snapshotted at
`scripts/cyberchef-categories.json`; the name-to-id mapping is curated in
`docs/parity-map.json`.

| | count |
| --- | --- |
| CyberChef operations | 505 |
| implemented here | 472 |
| still to port | 27 |
| deliberately not ported | 6 |
| DecodeBox operations with no CyberChef equivalent | 38 |

Total DecodeBox operations: **504**.

Status is `done` when an operation with the same behaviour exists here,
whatever it is called; `todo` when it does not; `wont` when it will not be
ported, always with the reason. Nothing is omitted from this table.

## Data format — 80/80

| CyberChef | status | DecodeBox | note |
| --- | --- | --- | --- |
| To Hexdump | done | `to-hexdump` | To Hexdump |
| From Hexdump | done | `from-hexdump` | From Hexdump |
| To Hex | done | `to-hex` | To Hex |
| From Hex | done | `from-hex` | From Hex |
| To Charcode | done | `to-charcode` | To Charcode |
| From Charcode | done | `from-charcode` | From Charcode |
| To Decimal | done | `to-decimal` | To Decimal |
| From Decimal | done | `from-decimal` | From Decimal |
| To Float | done | `to-float` | To Float |
| From Float | done | `from-float` | From Float |
| To Binary | done | `to-binary` | To Binary |
| From Binary | done | `from-binary` | From Binary |
| To Octal | done | `to-octal` | To Octal |
| From Octal | done | `from-octal` | From Octal |
| To Base32 | done | `to-base32` | To Base32 |
| From Base32 | done | `from-base32` | From Base32 |
| To Base45 | done | `to-base45` | To Base45 |
| From Base45 | done | `from-base45` | From Base45 |
| To Base58 | done | `to-base58` | To Base58 |
| From Base58 | done | `from-base58` | From Base58 |
| To Bech32 | done | `to-bech32` | To Bech32 |
| From Bech32 | done | `from-bech32` | From Bech32 |
| To Base62 | done | `to-base62` | To Base62 |
| From Base62 | done | `from-base62` | From Base62 |
| To Base64 | done | `to-base64` | To Base64 |
| From Base64 | done | `from-base64` | From Base64 |
| Show Base64 offsets | done | `show-base64-offsets` | Show Base64 offsets; a text report rather than highlighted HTML |
| To Base92 | done | `to-base92` | To Base92 |
| From Base92 | done | `from-base92` | From Base92 |
| To Base85 | done | `to-base85` | To Base85 |
| From Base85 | done | `from-base85` | From Base85 |
| To Base | done | `to-base` | To Base |
| From Base | done | `from-base` | From Base |
| To BCD | done | `to-bcd` | To BCD |
| From BCD | done | `from-bcd` | From BCD |
| Text-Integer Conversion | done | `text-integer` | Text-Integer Conversion |
| To HTML Entity | done | `to-html-entity` | To HTML Entity |
| From HTML Entity | done | `from-html-entity` | From HTML Entity |
| URL Encode | done | `url-encode` | URL Encode |
| URL Decode | done | `url-decode` | URL Decode |
| Escape Unicode Characters | done | `escape-unicode` | Escape Unicode Characters |
| Unescape Unicode Characters | done | `unescape-unicode` | Unescape Unicode Characters |
| Normalise Unicode | done | `normalise-unicode` | Normalise Unicode |
| Escape Smart Characters | done | `escape-smart-characters` | Escape Smart Characters |
| To Quoted Printable | done | `to-quoted-printable` | To Quoted Printable |
| From Quoted Printable | done | `from-quoted-printable` | From Quoted Printable |
| To Punycode | done | `to-punycode` | To Punycode |
| From Punycode | done | `from-punycode` | From Punycode |
| AMF Encode | done | `amf-encode` | AMF Encode |
| AMF Decode | done | `amf-decode` | AMF Decode |
| To Hex Content | done | `to-hex-content` | To Hex Content |
| From Hex Content | done | `from-hex-content` | From Hex Content |
| PEM to Hex | done | `pem-to-hex` | PEM to Hex |
| Hex to PEM | done | `hex-to-pem` | Hex to PEM |
| Parse ASN.1 hex string | done | `parse-asn1` | Parse ASN.1 hex string |
| Change IP format | done | `change-ip-format` | Change IP format |
| Encode text | done | `encode-text` | Encode text; the platform's ~38 WHATWG code pages, so no EBCDIC or IBM DOS pages |
| Decode text | done | `decode-text` | Decode text; the platform's ~38 WHATWG code pages, so no EBCDIC or IBM DOS pages |
| Text Encoding Brute Force | done | `text-encoding-brute-force` | Text Encoding Brute Force |
| Swap endianness | done | `swap-endianness` | Swap endianness |
| To MessagePack | done | `to-messagepack` | To MessagePack |
| From MessagePack | done | `from-messagepack` | From MessagePack |
| To Braille | done | `to-braille` | To Braille |
| From Braille | done | `from-braille` | From Braille |
| Parse TLV | done | `parse-tlv` | Parse TLV; keys and values are hex strings, not byte arrays |
| CSV to JSON | done | `csv-to-json` | CSV to JSON |
| JSON to CSV | done | `json-to-csv` | JSON to CSV |
| Avro to JSON | done | `avro-to-json` | Container files with the null or deflate codec; snappy, bzip2, xz and zstandard are named and refused. |
| CBOR Encode | done | `cbor-encode` | CBOR Encode |
| CBOR Decode | done | `cbor-decode` | CBOR Decode |
| YAML to JSON | done | `yaml-to-json` | A documented subset: block and flow syntax, block scalars, multiple documents. Anchors, aliases and tags are refused rather than guessed at. |
| JSON to YAML | done | `json-to-yaml` | JSON to YAML |
| Caret/M-decode | done | `caret-m-decode` | Caret/M-decode |
| Rison Encode | done | `rison-encode` | Rison Encode |
| Rison Decode | done | `rison-decode` | Rison Decode |
| To Modhex | done | `to-modhex` | To Modhex |
| From Modhex | done | `from-modhex` | From Modhex |
| MIME Decoding | done | `mime-decoding` | MIME Decoding |
| To COBS | done | `to-cobs` | To COBS |
| From COBS | done | `from-cobs` | From COBS |

## Encryption / Encoding — 90/95

| CyberChef | status | DecodeBox | note |
| --- | --- | --- | --- |
| AES Encrypt | done | `aes-encrypt` | AES Encrypt |
| AES Decrypt | done | `aes-decrypt` | AES Decrypt |
| Blowfish Encrypt | done | `blowfish-encrypt` | Blowfish Encrypt |
| Blowfish Decrypt | done | `blowfish-decrypt` | Blowfish Decrypt |
| DES Encrypt | done | `des-encrypt` | DES Encrypt |
| DES Decrypt | done | `des-decrypt` | DES Decrypt |
| Triple DES Encrypt | done | `triple-des-encrypt` | Triple DES Encrypt |
| Triple DES Decrypt | done | `triple-des-decrypt` | Triple DES Decrypt |
| Fernet Encrypt | done | `fernet-encrypt` | Fernet Encrypt |
| Fernet Decrypt | done | `fernet-decrypt` | Fernet Decrypt |
| LS47 Encrypt | todo | — | The marker and padding rules could not be reproduced from the specification offline, and ciphertext from a near-miss would not decrypt anywhere else. |
| LS47 Decrypt | todo | — | See LS47 Encrypt. |
| RC2 Encrypt | done | `rc2-encrypt` | RC2 Encrypt |
| RC2 Decrypt | done | `rc2-decrypt` | RC2 Decrypt |
| RC4 | done | `rc4` | RC4 |
| RC4 Drop | done | `rc4-drop` | RC4 Drop |
| ChaCha | done | `chacha` | ChaCha |
| Salsa20 | done | `salsa20` | Salsa20 |
| XSalsa20 | done | `xsalsa20` | XSalsa20 |
| Rabbit | done | `rabbit` | Rabbit |
| SM4 Encrypt | done | `sm4-encrypt` | SM4 Encrypt |
| SM4 Decrypt | done | `sm4-decrypt` | SM4 Decrypt |
| RC6 Encrypt | done | `rc6-encrypt` | RC6 Encrypt |
| RC6 Decrypt | done | `rc6-decrypt` | RC6 Decrypt |
| Ascon Encrypt | done | `ascon-encrypt` | Ascon-128 v1.2, checked against the first entry of the known-answer set. |
| Ascon Decrypt | done | `ascon-decrypt` | Ascon Decrypt |
| PRESENT Encrypt | done | `present-encrypt` | PRESENT Encrypt |
| PRESENT Decrypt | done | `present-decrypt` | PRESENT Decrypt |
| Twofish Encrypt | done | `twofish-encrypt` | Twofish Encrypt |
| Twofish Decrypt | done | `twofish-decrypt` | Twofish Decrypt |
| GOST Encrypt | done | `gost-encrypt` | The S-boxes are an argument: the standard leaves them as a parameter, different organisations were issued different sets, and shipping one under a name that might not be the set a message was written with would be worse than asking. |
| GOST Decrypt | done | `gost-decrypt` | GOST Decrypt |
| GOST Sign | todo | — | GOST R 34.10 signatures are elliptic curve arithmetic over curves Web Crypto does not carry, and would have to be written out by hand — the one thing this project refuses to do with public key cryptography. The same reason as SM2. |
| GOST Verify | todo | — | See GOST Sign. |
| GOST Key Wrap | done | `gost-key-wrap` | The RFC 4357 wrap: ECB over the key, bound by GOST’s own MAC over the UKM. |
| GOST Key Unwrap | done | `gost-key-unwrap` | GOST Key Unwrap |
| ROR13 | done | `ror13` | ROR13 |
| ROT13 | done | `rot13` | ROT13 |
| ROT13 Brute Force | done | `rot-n` | ROT13 Brute Force |
| ROT47 | done | `rot47` | ROT47 |
| ROT47 Brute Force | done | `rot47-brute-force` | ROT47 Brute Force |
| ROT8000 | done | `rot8000` | ROT8000 |
| XOR | done | `xor` | XOR |
| XOR Brute Force | done | `xor-brute-force` | XOR Brute Force |
| Vigenère Encode | done | `vigenere-encode` | Vigenère Encode |
| Vigenère Decode | done | `vigenere-decode` | Vigenère Decode |
| TEA Encrypt | done | `tea-encrypt` | TEA Encrypt |
| TEA Decrypt | done | `tea-decrypt` | TEA Decrypt |
| XTEA Encrypt | done | `xtea-encrypt` | XTEA Encrypt |
| XTEA Decrypt | done | `xtea-decrypt` | XTEA Decrypt |
| XXTEA Encrypt | done | `xxtea-encrypt` | XXTEA Encrypt |
| XXTEA Decrypt | done | `xxtea-decrypt` | XXTEA Decrypt |
| To Morse Code | done | `to-morse` | To Morse Code |
| From Morse Code | done | `from-morse` | From Morse Code |
| Bacon Cipher Encode | done | `bacon-encode` | Bacon Cipher Encode |
| Bacon Cipher Decode | done | `bacon-decode` | Bacon Cipher Decode |
| Bifid Cipher Encode | done | `bifid-encode` | Bifid Cipher Encode |
| Bifid Cipher Decode | done | `bifid-decode` | Bifid Cipher Decode |
| Caesar Box Cipher | done | `caesar-box-cipher` | Caesar Box Cipher |
| Affine Cipher Encode | done | `affine-encode` | Affine Encode |
| Affine Cipher Decode | done | `affine-decode` | Affine Decode |
| A1Z26 Cipher Encode | done | `a1z26-encode` | A1Z26 Encode |
| A1Z26 Cipher Decode | done | `a1z26-decode` | A1Z26 Decode |
| Rail Fence Cipher Encode | done | `rail-fence-encode` | Rail Fence Encode |
| Rail Fence Cipher Decode | done | `rail-fence-decode` | Rail Fence Decode |
| Atbash Cipher | done | `atbash` | Atbash Cipher |
| CipherSaber2 Encrypt | done | `ciphersaber2-encrypt` | CipherSaber2 Encrypt |
| CipherSaber2 Decrypt | done | `ciphersaber2-decrypt` | CipherSaber2 Decrypt |
| Cetacean Cipher Encode | done | `cetacean-encode` | Cetacean Cipher Encode |
| Cetacean Cipher Decode | done | `cetacean-decode` | Cetacean Cipher Decode |
| Substitute | done | `find-replace` | Find / Replace |
| Derive PBKDF2 key | done | `pbkdf2` | Derive PBKDF2 key |
| Derive EVP key | done | `derive-evp-key` | Derive EVP key |
| Derive HKDF key | done | `derive-hkdf-key` | Derive HKDF key |
| Bcrypt | done | `bcrypt` | Bcrypt; cost capped at 16 so a mistyped setting cannot hang the tab |
| Scrypt | done | `scrypt` | Scrypt |
| JWT Sign | done | `jwt-sign` | JWT Sign; HS, RS and ES families, with PEM keys for the asymmetric ones |
| JWT Verify | done | `jwt-verify` | JWT Verify; refuses alg:none rather than reporting an unsigned token as valid |
| JWT Decode | done | `jwt-decode` | JWT Decode |
| Citrix CTX1 Encode | done | `citrix-ctx1-encode` | Citrix CTX1 Encode |
| Citrix CTX1 Decode | done | `citrix-ctx1-decode` | Citrix CTX1 Decode |
| AES Key Wrap | done | `aes-key-wrap` | AES Key Wrap |
| AES Key Unwrap | done | `aes-key-unwrap` | AES Key Unwrap |
| Pseudo-Random Number Generator | done | `pseudo-random-number-generator` | Pseudo-Random Number Generator |
| Pseudo-Random Prime Generator | done | `pseudo-random-prime-generator` | Pseudo-Random Prime Generator |
| Enigma | done | `enigma` | Enigma |
| Bombe | done | `bombe` | Bombe |
| Multiple Bombe | done | `multiple-bombe` | Multiple Bombe |
| Typex | done | `typex` | The mechanism, with the rotor wirings supplied as an argument. Typex wirings were never published the way Enigma’s were, and shipping an unverifiable set would look authoritative while being wrong. |
| Lorenz | done | `lorenz` | The machine, with the wheel patterns supplied as an argument: the pins changed monthly and there is no single set to ship. |
| Colossus | done | `colossus` | The 1+2 break-in count Colossus was built to run, over the chi 1 and chi 2 start positions. The switch panel of the real machine is not simulated. |
| SIGABA | todo | — | The cipher rotors are stepped by the control and index banks through a wiring whose details could not be reproduced with confidence offline. A rotor machine that steps wrongly produces ciphertext no real machine could. |
| Flask Session Decode | done | `flask-session-decode` | Flask Session Decode |
| Flask Session Sign | done | `flask-session-sign` | Flask Session Sign |
| Flask Session Verify | done | `flask-session-verify` | Flask Session Verify |

## Public Key — 23/32

| CyberChef | status | DecodeBox | note |
| --- | --- | --- | --- |
| Parse X.509 certificate | done | `parse-x509-certificate` | Parse X.509 certificate; a text report, with the common extensions decoded by name |
| Parse X.509 CRL | done | `parse-x509-crl` | Parse X.509 CRL |
| Parse ASN.1 hex string | done | `parse-asn1` | Parse ASN.1 hex string |
| PEM to Hex | done | `pem-to-hex` | PEM to Hex |
| Hex to PEM | done | `hex-to-pem` | Hex to PEM |
| Hex to Object Identifier | done | `hex-to-object-identifier` | Hex to Object Identifier |
| Object Identifier to Hex | done | `object-identifier-to-hex` | Object Identifier to Hex |
| PEM to JWK | done | `pem-to-jwk` | PEM to JWK |
| JWK to PEM | done | `jwk-to-pem` | JWK to PEM |
| Generate PGP Key Pair | todo | — | OpenPGP key generation needs the whole standard: string-to-key, the packet layer, and public key algorithms Web Crypto does not provide. Parse PGP Key reads a key that already exists, which is what most analysis needs. |
| PGP Encrypt | todo | — | The OpenPGP message layer needs session keys, its own CFB variant, compression and several algorithms the platform does not carry. |
| PGP Decrypt | todo | — | See PGP Encrypt. |
| PGP Sign | todo | — | See PGP Encrypt. |
| PGP Verify | todo | — | See PGP Encrypt. A partial verifier is the worst case of all: it would report success for messages it had not really checked. |
| PGP Encrypt and Sign | todo | — | See PGP Encrypt. |
| PGP Decrypt and Verify | todo | — | See PGP Encrypt. |
| Parse PGP Key | done | `parse-pgp-key` | Packet structure, algorithms, user IDs, subkeys, signatures and version-4 fingerprints. Checked against GnuPG’s own output for an RSA key and an Ed25519 key with a subkey. |
| Generate RSA Key Pair | done | `generate-rsa-key-pair` | Generate RSA Key Pair |
| RSA Sign | done | `rsa-sign` | PKCS#1 v1.5 and PSS, through Web Crypto. |
| RSA Verify | done | `rsa-verify` | RSA Verify |
| RSA Encrypt | done | `rsa-encrypt` | OAEP. Textbook RSA with no padding is not offered, because it is not encryption. |
| RSA Decrypt | done | `rsa-decrypt` | RSA Decrypt |
| Generate ECDSA Key Pair | done | `generate-ecdsa-key-pair` | Generate ECDSA Key Pair |
| ECDSA Signature Conversion | done | `ecdsa-signature-conversion` | ECDSA Signature Conversion |
| ECDSA Sign | done | `ecdsa-sign` | P-256, P-384 and P-521, in raw or DER form. |
| ECDSA Verify | done | `ecdsa-verify` | ECDSA Verify |
| Parse SSH Host Key | done | `parse-ssh-host-key` | Parse SSH Host Key |
| Parse CSR | done | `parse-csr` | Parse CSR |
| Public Key from Certificate | done | `public-key-from-certificate` | Public Key from Certificate |
| Public Key from Private Key | done | `public-key-from-private-key` | Public Key from Private Key |
| SM2 Encrypt | todo | — | SM2 is elliptic curve arithmetic over a curve Web Crypto does not carry, so it would have to be written out by hand — the one thing this project refuses to do with public key cryptography. |
| SM2 Decrypt | todo | — | See SM2 Encrypt. |

## Arithmetic / Logic — 31/31

| CyberChef | status | DecodeBox | note |
| --- | --- | --- | --- |
| Set Union | done | `set-union` | Set Union |
| Set Intersection | done | `set-intersection` | Set Intersection |
| Set Difference | done | `set-difference` | Set Difference |
| Symmetric Difference | done | `symmetric-difference` | Symmetric Difference |
| Cartesian Product | done | `cartesian-product` | Cartesian Product |
| Power Set | done | `power-set` | Power Set |
| XOR | done | `xor` | XOR |
| XOR Brute Force | done | `xor-brute-force` | XOR Brute Force |
| OR | done | `or` | OR |
| NOT | done | `not` | NOT |
| AND | done | `and` | AND |
| ADD | done | `add` | ADD |
| SUB | done | `sub` | SUB |
| Sum | done | `sum` | Sum |
| Subtract | done | `subtract` | Subtract |
| Multiply | done | `multiply` | Multiply |
| Divide | done | `divide` | Divide |
| MOD | done | `mod` | MOD |
| Extended GCD | done | `extended-gcd` | Extended GCD |
| Modular Exponentiation | done | `modular-exponentiation` | Modular Exponentiation |
| Modular Inverse | done | `modular-inverse` | Modular Inverse |
| Mean | done | `mean` | Mean |
| Median | done | `median` | Median |
| Standard Deviation | done | `standard-deviation` | Standard Deviation |
| Bit shift left | done | `bit-shift` | Shift bits |
| Bit shift right | done | `bit-shift` | Shift bits |
| Rotate left | done | `bit-rotate` | Rotate bits |
| Rotate right | done | `bit-rotate` | Rotate bits |
| ROR13 | done | `ror13` | ROR13 |
| ROT13 | done | `rot13` | ROT13 |
| ROT8000 | done | `rot8000` | ROT8000 |

## Networking — 36/38

| CyberChef | status | DecodeBox | note |
| --- | --- | --- | --- |
| HTTP request | wont | — | Sends the input to a server the recipe names. Recipes are shareable by URL, so this would turn a shared link into an exfiltration channel — and DecodeBox promises that nothing leaves the browser. |
| DNS over HTTPS | wont | — | Same reason as HTTP request: it would send the input to a third-party resolver, which the tool's privacy promise rules out. |
| Strip HTTP headers | done | `strip-http-headers` | Strip HTTP headers |
| Dechunk HTTP response | done | `dechunk-http-response` | Dechunk HTTP response |
| Parse Ethernet frame | done | `parse-ethernet-frame` | Parse Ethernet frame |
| Parse User Agent | done | `parse-user-agent` | Parse User Agent |
| Parse IP range | done | `parse-ip-range` | Parse IP range |
| Parse IPv6 address | done | `parse-ipv6-address` | Parse IPv6 address |
| IPv6 Transition Addresses | done | `ipv6-transition-addresses` | IPv6 Transition Addresses |
| Parse IPv4 header | done | `parse-ipv4-header` | Parse IPv4 header |
| Strip IPv4 header | done | `strip-ipv4-header` | Strip IPv4 header |
| Parse TCP | done | `parse-tcp` | Parse TCP |
| Strip TCP header | done | `strip-tcp-header` | Strip TCP header |
| Parse TLS record | done | `parse-tls-record` | Parse TLS record |
| Parse UDP | done | `parse-udp` | Parse UDP |
| Strip UDP header | done | `strip-udp-header` | Strip UDP header |
| Parse SSH Host Key | done | `parse-ssh-host-key` | Parse SSH Host Key |
| Parse URI | done | `parse-uri` | Parse URI |
| URL Encode | done | `url-encode` | URL Encode |
| URL Decode | done | `url-decode` | URL Decode |
| Protobuf Decode | done | `protobuf-decode` | Protobuf Decode; schema-less, so fields are reported by number and wire type |
| Protobuf Encode | done | `protobuf-encode` | Protobuf Encode; takes the field list Protobuf Decode produces, not a .proto schema |
| VarInt Encode | done | `varint-encode` | VarInt Encode |
| VarInt Decode | done | `varint-decode` | VarInt Decode |
| JA3 Fingerprint | done | `ja3-fingerprint` | JA3 Fingerprint |
| JA3S Fingerprint | done | `ja3s-fingerprint` | JA3S Fingerprint |
| JA4 Fingerprint | done | `ja4-fingerprint` | JA4 Fingerprint |
| JA4Server Fingerprint | done | `ja4server-fingerprint` | JA4Server Fingerprint |
| HASSH Client Fingerprint | done | `hassh-client-fingerprint` | HASSH Client Fingerprint |
| HASSH Server Fingerprint | done | `hassh-server-fingerprint` | HASSH Server Fingerprint |
| Format MAC addresses | done | `format-mac-addresses` | Format MAC addresses |
| Change IP format | done | `change-ip-format` | Change IP format |
| Group IP addresses | done | `group-ip-addresses` | Group IP addresses |
| Encode NetBIOS Name | done | `encode-netbios-name` | Encode NetBIOS Name |
| Decode NetBIOS Name | done | `decode-netbios-name` | Decode NetBIOS Name |
| Defang URL | done | `defang` | Defang IOCs |
| Fang URL | done | `refang` | Refang IOCs |
| Defang IP Addresses | done | `defang` | Defang IOCs |

## Language — 7/7

| CyberChef | status | DecodeBox | note |
| --- | --- | --- | --- |
| Encode text | done | `encode-text` | Encode text; the platform's ~38 WHATWG code pages, so no EBCDIC or IBM DOS pages |
| Decode text | done | `decode-text` | Decode text; the platform's ~38 WHATWG code pages, so no EBCDIC or IBM DOS pages |
| Unicode Text Format | done | `unicode-text-format` | Unicode Text Format |
| Remove Diacritics | done | `remove-diacritics` | Remove diacritics |
| Unescape Unicode Characters | done | `unescape-unicode` | Unescape Unicode Characters |
| Convert to NATO alphabet | done | `to-nato` | To NATO alphabet |
| Convert Leet Speak | done | `convert-leet-speak` | Convert Leet Speak |

## Utils — 51/52

| CyberChef | status | DecodeBox | note |
| --- | --- | --- | --- |
| Diff | done | `diff` | Diff; `+`/`-` markers rather than `<ins>`/`<del>`, and no CSS or JSON modes |
| Remove whitespace | done | `remove-whitespace` | Remove whitespace |
| Remove null bytes | done | `remove-null-bytes` | Remove null bytes |
| Remove ANSI Escape Codes | done | `remove-ansi-escape-codes` | Remove ANSI Escape Codes |
| To Upper case | done | `to-upper-case` | To Upper case |
| To Lower case | done | `to-lower-case` | To Lower case |
| Swap case | done | `swap-case` | Swap case |
| Alternating Caps | done | `alternating-caps` | Alternating Caps |
| To Case Insensitive Regex | done | `to-case-insensitive-regex` | To Case Insensitive Regex |
| From Case Insensitive Regex | done | `from-case-insensitive-regex` | From Case Insensitive Regex |
| Add line numbers | done | `add-line-numbers` | Add line numbers |
| Remove line numbers | done | `remove-line-numbers` | Remove line numbers |
| Get All Casings | done | `get-all-casings` | Get All Casings |
| To Table | done | `to-table` | To table |
| Reverse | done | `reverse` | Reverse |
| Sort | done | `sort` | Sort |
| Shuffle | done | `shuffle` | Shuffle |
| Unique | done | `unique` | Unique |
| Split | done | `split` | Split |
| Filter | done | `filter` | Filter |
| Head | done | `head` | Head |
| Tail | done | `tail` | Tail |
| Count occurrences | done | `count-occurrences` | Count occurrences |
| Expand alphabet range | done | `expand-alphabet-range` | Expand alphabet range |
| Drop bytes | done | `drop-bytes` | Drop bytes |
| Take bytes | done | `take-bytes` | Take bytes |
| Pad lines | done | `pad-lines` | Pad lines |
| Find / Replace | done | `find-replace` | Find / Replace |
| Regular expression | done | `regular-expression` | Regular expression |
| Fuzzy Match | done | `fuzzy-match` | Fuzzy Match; ranked text lines rather than highlighted HTML |
| Offset checker | done | `offset-checker` | Offset checker; a marker line rather than highlighted HTML |
| Hamming Distance | done | `hamming-distance` | Hamming Distance |
| Levenshtein Distance | done | `levenshtein-distance` | Levenshtein Distance |
| Convert distance | done | `convert-distance` | Convert distance |
| Convert area | done | `convert-area` | Convert area |
| Convert mass | done | `convert-mass` | Convert mass |
| Convert speed | done | `convert-speed` | Convert speed |
| Convert data units | done | `convert-data-units` | Convert data units |
| Convert co-ordinate format | done | `convert-coordinate-format` | Decimal degrees, degrees minutes seconds, degrees decimal minutes and geohash. UTM, MGRS and OSNG are projections onto an ellipsoid rather than another spelling, and are not included. |
| Show on map | wont | — | It fetches map tiles from a third-party server, which would send the coordinates you are analysing off the machine. Nothing in DecodeBox leaves the browser. |
| Parse UNIX file permissions | done | `parse-unix-file-permissions` | Parse UNIX file permissions |
| Parse ObjectID timestamp | done | `parse-objectid-timestamp` | Parse ObjectID timestamp |
| Swap endianness | done | `swap-endianness` | Swap endianness |
| Parse colour code | done | `parse-colour-code` | Parse colour code; every notation as text, without the colour picker |
| Escape string | done | `escape-string` | Escape string; hand-written escaping rather than jsesc, same options |
| Unescape string | done | `unescape-string` | Unescape string |
| Pseudo-Random Number Generator | done | `pseudo-random-number-generator` | Pseudo-Random Number Generator |
| Sleep | done | `sleep` | Sleep; capped at 3 seconds so it cannot outlive the step timeout |
| File Tree | done | `file-tree` | File Tree |
| Wrap | done | `wrap-lines` | Wrap lines |
| Take nth bytes | done | `take-nth-bytes` | Take nth bytes |
| Drop nth bytes | done | `drop-nth-bytes` | Drop nth bytes |

## Date / Time — 10/10

| CyberChef | status | DecodeBox | note |
| --- | --- | --- | --- |
| Parse DateTime | done | `parse-datetime` | Parse date and time |
| Translate DateTime Format | done | `translate-datetime-format` | Translate DateTime Format; moment-style tokens on the platform's own time-zone data |
| From UNIX Timestamp | done | `from-unix-timestamp` | From UNIX Timestamp |
| To UNIX Timestamp | done | `to-unix-timestamp` | To UNIX Timestamp |
| Windows Filetime to UNIX Timestamp | done | `from-filetime` | From Windows FILETIME |
| UNIX Timestamp to Windows Filetime | done | `to-filetime` | To Windows FILETIME |
| DateTime Delta | done | `datetime-delta` | DateTime Delta |
| Extract dates | done | `extract-dates` | Extract dates |
| Get Time | done | `now` | Current time |
| Sleep | done | `sleep` | Sleep; capped at 3 seconds so it cannot outlive the step timeout |

## Extractors — 19/20

| CyberChef | status | DecodeBox | note |
| --- | --- | --- | --- |
| Strings | done | `strings` | Extract strings |
| Extract IP addresses | done | `extract-ips` | Extract IP addresses |
| Extract email addresses | done | `extract-emails` | Extract email addresses |
| Extract MAC addresses | done | `extract-mac` | Extract MAC addresses |
| Extract URLs | done | `extract-urls` | Extract URLs |
| Extract domains | done | `extract-domains` | Extract domains |
| Extract file paths | done | `extract-file-paths` | Extract file paths |
| Extract dates | done | `extract-dates` | Extract dates |
| Extract hashes | done | `extract-hashes` | Extract hashes |
| Regular expression | done | `regular-expression` | Regular expression |
| XPath expression | done | `xpath-expression` | XPath expression; paths, //, @attr, text() and simple predicates — no axes, functions or unions |
| JPath expression | done | `jpath-expression` | JPath expression; paths, indexes, slices and recursive descent, but not filter expressions |
| Jsonata Query | wont | — | A complete query language of its own, several thousand lines to implement faithfully. JPath expression covers path queries over JSON. |
| CSS selector | done | `css-selector` | CSS selector |
| Extract EXIF | done | `extract-exif` | Extract EXIF |
| Extract ID3 | done | `extract-id3` | Extract ID3 |
| Extract Audio Metadata | done | `extract-audio-metadata` | MP3 (ID3v1 and ID3v2), FLAC, Ogg Vorbis, WAV and AVI. |
| Extract Files | done | `scan-embedded-files` | Scan for embedded files |
| RAKE | done | `rake` | RAKE |
| Template | done | `template` | Template; a Mustache subset, with no helpers or partials, so a recipe cannot run code |

## Compression — 21/21

| CyberChef | status | DecodeBox | note |
| --- | --- | --- | --- |
| Raw Deflate | done | `raw-deflate` | Raw Deflate |
| Raw Inflate | done | `raw-inflate` | Raw Inflate |
| Zlib Deflate | done | `zlib-deflate` | Zlib Deflate |
| Zlib Inflate | done | `zlib-inflate` | Zlib Inflate |
| Gzip | done | `gzip` | Gzip |
| Gunzip | done | `gunzip` | Gunzip |
| Zip | done | `zip` | Zip; one entry per archive, stored or deflated, without password encryption |
| Unzip | done | `extract-from-zip` | Extract from ZIP |
| Bzip2 Decompress | done | `bzip2-decompress` | Bzip2 Decompress |
| Bzip2 Compress | done | `bzip2-compress` | Written here rather than taken from a library; verified by handing its output to libbz2. |
| Tar | done | `tar` | Tar |
| Untar | done | `untar` | Untar |
| LZString Decompress | done | `lzstring-decompress` | LZString Decompress |
| LZString Compress | done | `lzstring-compress` | LZString Compress |
| LZMA Decompress | done | `lzma-decompress` | The plain .lzma container. Streams inside .xz or .7z need unpacking first. |
| LZMA Compress | done | `lzma-compress` | A bounded greedy match finder rather than an optimal parser: the output is valid LZMA and a little larger than 7-Zip’s. |
| LZ4 Decompress | done | `lz4-decompress` | LZ4 Decompress |
| LZ4 Compress | done | `lz4-compress` | LZ4 Compress |
| LZNT1 Decompress | done | `lznt1-decompress` | LZNT1 Decompress |
| XPRESS Decompress | done | `xpress-decompress` | XPRESS Decompress |
| XPRESS LZ77+Huffman Decompress | done | `xpress-huffman-decompress` | The format records no decompressed size, so without the optional size argument a few bytes of padding can follow the data. |

## Hashing — 46/50

| CyberChef | status | DecodeBox | note |
| --- | --- | --- | --- |
| Analyse hash | done | `identify-hash` | Analyse Hash |
| Generate all checksums | done | `all-checksums` | Generate all checksums |
| Generate all hashes | done | `generate-all-hashes` | Runs every digest this build can compute; the list is the DecodeBox set, not CyberChef’s. |
| MD2 | done | `md2` | MD2 |
| MD4 | done | `md4` | MD4 |
| MD5 | done | `md5` | MD5 |
| MD6 | todo | — | No published vector was available offline to check an implementation against, and a hash nobody can check is a hash that should not be shipped. |
| SHA0 | done | `sha-0` | SHA0 |
| SHA1 | done | `sha-1` | SHA-1 |
| SHA2 | done | `sha-256` | SHA-256 |
| SHA3 | done | `sha3` | SHA3 |
| SM3 | done | `sm3` | SM3 |
| Keccak | done | `keccak` | Keccak |
| Shake | done | `shake` | Shake |
| RIPEMD | done | `ripemd` | RIPEMD |
| HAS-160 | done | `has-160` | HAS-160 |
| Whirlpool | done | `whirlpool` | Whirlpool |
| Snefru | todo | — | Its S-boxes are eight kilobytes of values drawn from a random source in 1990. They cannot be derived and were not available offline. |
| BLAKE2b | done | `blake2b` | BLAKE2b |
| BLAKE2s | done | `blake2s` | BLAKE2s |
| BLAKE3 | done | `blake3` | Hash, keyed hash and key derivation, with extendable output. Checked against the published vectors either side of the 1 KiB chunk boundary and up to 4 KiB, which is what exercises the tree. |
| Ascon Hash | done | `ascon-hash` | Ascon v1.2, the version selected by the lightweight cryptography process. NIST SP 800-232 changes the initial values, so a 2025 library will not agree. |
| Ascon MAC | done | `ascon-mac` | Ascon MAC |
| GOST Hash | todo | — | GOST R 34.11-94 is defined by a large substitution parameter set that cannot be derived and was not available offline. A guessed constant produces a digest that is confidently wrong. |
| Streebog | todo | — | GOST R 34.11-2012 needs a 256-byte substitution, a 64x64 binary matrix and twelve 64-byte round constants, none of them derivable and none available offline. |
| SSDEEP | done | `ssdeep` | Tridgell’s spamsum algorithm with the published constants. There is no libfuzzy on the build machine to check interoperability against, so a comparison against a hash from ssdeep itself is unconfirmed; comparisons between two DecodeBox hashes are exact. |
| CTPH | done | `ctph` | The same algorithm as SSDEEP, under its generic name. |
| Compare SSDEEP hashes | done | `compare-ssdeep-hashes` | Compare SSDEEP hashes |
| Compare CTPH hashes | done | `compare-ctph-hashes` | Compare CTPH hashes |
| HMAC | done | `hmac` | HMAC |
| CMAC | done | `cmac` | CMAC |
| Bcrypt | done | `bcrypt` | Bcrypt; cost capped at 16 so a mistyped setting cannot hang the tab |
| Bcrypt compare | done | `bcrypt-compare` | Bcrypt compare |
| Bcrypt parse | done | `bcrypt-parse` | Bcrypt parse |
| Argon2 | done | `argon2` | Argon2 |
| Argon2 compare | done | `argon2-compare` | Argon2 compare |
| Scrypt | done | `scrypt` | Scrypt |
| NT Hash | done | `nt-hash` | NT Hash |
| LM Hash | done | `lm-hash` | LM Hash |
| MurmurHash3 | done | `murmurhash3` | MurmurHash3 |
| Fletcher-8 Checksum | done | `fletcher-8` | Fletcher-8 Checksum |
| Fletcher-16 Checksum | done | `fletcher-16` | Fletcher-16 Checksum |
| Fletcher-32 Checksum | done | `fletcher-32` | Fletcher-32 Checksum |
| Fletcher-64 Checksum | done | `fletcher-64` | Fletcher-64 Checksum |
| Adler-32 Checksum | done | `adler-32` | Adler-32 Checksum |
| Luhn Checksum | done | `luhn-checksum` | Luhn Checksum |
| CRC Checksum | done | `crc-checksum` | CRC Checksum |
| TCP/IP Checksum | done | `tcp-ip-checksum` | TCP/IP Checksum |
| XOR Checksum | done | `xor-checksum` | XOR Checksum |
| Parity Bit | done | `parity-bit` | Parity Bit |

## Code tidy — 27/30

| CyberChef | status | DecodeBox | note |
| --- | --- | --- | --- |
| Syntax highlighter | wont | — | It emits HTML for a pane that renders it. DecodeBox’s output pane renders text and pictures and never HTML, deliberately: building markup out of untrusted input is the bug class the whole tool exists to avoid. |
| Generic Code Beautify | done | `generic-code-beautify` | Generic Code Beautify |
| JavaScript Parser | todo | — | A JavaScript parser is a language implementation. JavaScript Beautify and JavaScript Minify cover what people reach for it for. |
| JavaScript Beautify | done | `javascript-beautify` | JavaScript Beautify; brace-driven re-indent, no quote normalisation |
| JavaScript Minify | done | `javascript-minify` | JavaScript Minify; whitespace and comments only, not terser's renaming |
| JSON Beautify | done | `json-beautify` | JSON Beautify |
| JSON Minify | done | `json-minify` | JSON Minify |
| XML Beautify | done | `xml-beautify` | XML Beautify |
| XML Minify | done | `xml-minify` | XML Minify |
| SQL Beautify | done | `sql-beautify` | SQL Beautify |
| SQL Minify | done | `sql-minify` | SQL Minify |
| CSS Beautify | done | `css-beautify` | CSS Beautify |
| CSS Minify | done | `css-minify` | CSS Minify |
| XPath expression | done | `xpath-expression` | XPath expression; paths, //, @attr, text() and simple predicates — no axes, functions or unions |
| JPath expression | done | `jpath-expression` | JPath expression; paths, indexes, slices and recursive descent, but not filter expressions |
| Jq | todo | — | A query language of its own, like Jsonata. JPath expression covers path queries. |
| CSS selector | done | `css-selector` | CSS selector |
| PHP Deserialize | done | `php-deserialize` | PHP Deserialize |
| PHP Serialize | done | `php-serialize` | PHP Serialize |
| Microsoft Script Decoder | done | `microsoft-script-decoder` | Microsoft Script Decoder |
| Strip HTML tags | done | `strip-html` | Strip HTML tags |
| Diff | done | `diff` | Diff; `+`/`-` markers rather than `<ins>`/`<del>`, and no CSS or JSON modes |
| To Snake case | done | `to-snake-case` | To Snake case |
| To Camel case | done | `to-camel-case` | To Camel case |
| To Kebab case | done | `to-kebab-case` | To Kebab case |
| BSON serialise | done | `bson-serialise` | BSON serialise |
| BSON deserialise | done | `bson-deserialise` | BSON deserialise |
| To MessagePack | done | `to-messagepack` | To MessagePack |
| From MessagePack | done | `from-messagepack` | From MessagePack |
| Render Markdown | done | `render-markdown` | Render Markdown; emits escaped HTML as text rather than rendering it |

## Forensics — 12/12

| CyberChef | status | DecodeBox | note |
| --- | --- | --- | --- |
| Detect File Type | done | `detect-file-type` | Detect file type |
| Scan for Embedded Files | done | `scan-embedded-files` | Scan for embedded files |
| Extract Files | done | `scan-embedded-files` | Scan for embedded files |
| YARA Rules | done | `yara-rules` | Text, hex and regex strings with the nocase, wide, ascii and fullword modifiers; conditions with counts, at, filesize, the uint family and the counting forms. Modules (pe, elf, math, hash) and for-loops are named and refused rather than ignored. |
| Remove EXIF | done | `strip-exif` | Strip EXIF |
| Extract EXIF | done | `extract-exif` | Extract EXIF |
| Extract RGBA | done | `extract-rgba` | Extract RGBA |
| View Bit Plane | done | `view-bit-plane` | View Bit Plane |
| Randomize Colour Palette | done | `randomize-colour-palette` | Randomize Colour Palette |
| Extract LSB | done | `extract-lsb` | Extract LSB |
| ELF Info | done | `elf-info` | ELF Info |
| Extract Audio Metadata | done | `extract-audio-metadata` | MP3 (ID3v1 and ID3v2), FLAC, Ogg Vorbis, WAV and AVI. |

## Multimedia — 26/29

| CyberChef | status | DecodeBox | note |
| --- | --- | --- | --- |
| Render Image | done | `render-image` | Render image |
| Play Media | todo | — | The output pane renders pictures and text. Playing audio would mean handing untrusted bytes to a media decoder inside the page, which is a larger attack surface than the feature is worth. |
| Generate Image | done | `generate-image` | Generate Image |
| Optical Character Recognition | todo | — | Needs a trained OCR engine. Shipping a model would be a dependency larger than the rest of the tool. |
| Remove EXIF | done | `strip-exif` | Strip EXIF |
| Extract EXIF | done | `extract-exif` | Extract EXIF |
| Split Colour Channels | done | `split-colour-channels` | One picture with the three channels side by side, rather than a zip of three files. |
| Rotate Image | done | `rotate-image` | Quarter turns. An arbitrary angle would need resampling that invents pixels. |
| Resize Image | done | `resize-image` | Resize Image |
| Blur Image | done | `blur-image` | Blur Image |
| Dither Image | done | `dither-image` | Floyd-Steinberg to black and white. |
| Invert Image | done | `invert-image` | Reads PNG and BMP; JPEG and GIF are named and refused rather than guessed at. |
| Flip Image | done | `flip-image` | Flip Image |
| Crop Image | done | `crop-image` | Crop Image |
| Image Brightness / Contrast | done | `image-brightness-contrast` | Image Brightness / Contrast |
| Image Opacity | done | `image-opacity` | Image Opacity |
| Image Filter | done | `image-filter` | Image Filter |
| Contain Image | done | `contain-image` | Contain Image |
| Cover Image | done | `cover-image` | Cover Image |
| Image Hue/Saturation/Lightness | done | `image-hsl` | Image Hue/Saturation/Lightness |
| Sharpen Image | done | `sharpen-image` | Sharpen Image |
| Normalise Image | done | `normalise-image` | Normalise Image |
| Convert Image Format | done | `convert-image-format` | PNG and BMP. Writing JPEG would need an encoder that throws information away, which is the wrong default for evidence. |
| Add Text To Image | done | `add-text-to-image` | A built-in 5x7 bitmap font. Measuring a web font needs a canvas, which the image code deliberately avoids. |
| Hex Density chart | done | `hex-density-chart` | Hex Density chart |
| Scatter chart | done | `scatter-chart` | Drawn as a PNG rather than SVG: the output pane will not render SVG, because SVG is markup that can carry script. |
| Series chart | done | `series-chart` | Series chart |
| Heatmap chart | done | `heatmap-chart` | Heatmap chart |
| Render PDF | todo | — | A PDF renderer is a project rather than an operation. Detect File Type and the text extractors read what is inside one. |

## Other — 17/22

| CyberChef | status | DecodeBox | note |
| --- | --- | --- | --- |
| Entropy | done | `entropy` | Entropy |
| Frequency distribution | done | `frequency-distribution` | Frequency distribution |
| Index of Coincidence | done | `index-of-coincidence` | Index of coincidence |
| Chi Square | done | `chi-square` | Chi-square against English |
| P-list Viewer | done | `plist-viewer` | Binary and XML, read to the same JSON either way. |
| Disassemble x86 | todo | — | A disassembler is a table of every encoding the architecture defines, and one wrong entry turns a report into a wrong answer that reads like a right one. Not attempted rather than attempted badly. |
| Disassemble ARM | todo | — | The same reason as Disassemble x86: an instruction table that cannot be verified offline is not worth shipping. |
| Pseudo-Random Number Generator | done | `pseudo-random-number-generator` | Pseudo-Random Number Generator |
| Pseudo-Random Integer Generator | done | `pseudo-random-integer-generator` | Pseudo-Random Integer Generator |
| Generate De Bruijn Sequence | done | `generate-de-bruijn-sequence` | Generate De Bruijn Sequence |
| Generate UUID | done | `generate-uuid` | Generate UUID |
| Analyse UUID | done | `analyse-uuid` | Analyse UUID |
| Generate TOTP | done | `generate-totp` | Generate TOTP |
| Generate HOTP | done | `generate-hotp` | Generate HOTP |
| Generate QR Code | todo | — | Reed-Solomon coding, masking and a format-information BCH. Left until it can be checked against a real decoder, which was not available offline. |
| Parse QR Code | todo | — | Finding and rectifying a symbol in a photograph, then decoding it. See Generate QR Code. |
| Haversine distance | done | `haversine-distance` | Haversine distance |
| HTML To Text | done | `strip-html` | Strip HTML tags |
| Generate Lorem Ipsum | done | `generate-lorem-ipsum` | Generate Lorem Ipsum |
| Numberwang | done | `numberwang` | Numberwang |
| XKCD Random Number | done | `xkcd-random-number` | XKCD Random Number |
| Automated Validation Test Op | wont | — | It exists to exercise CyberChef’s own test harness, not to transform anything. DecodeBox’s test suite does that job. |

## Flow control — 10/10

| CyberChef | status | DecodeBox | note |
| --- | --- | --- | --- |
| Magic | done | `magic` | Magic |
| Fork | done | `fork` | Fork |
| Subsection | done | `subsection` | Subsection |
| Merge | done | `merge` | Merge |
| Register | done | `register` | Register |
| Label | done | `label` | Label |
| Jump | done | `jump` | Jump |
| Conditional Jump | done | `conditional-jump` | Conditional Jump |
| Return | done | `return` | Return |
| Comment | done | `comment` | Comment |

## DecodeBox operations CyberChef does not have

- `to-case` — Change case
- `compare-hash` — Compare to hash
- `compress-ipv6` — Compress IPv6
- `crc-16` — CRC-16 Checksum
- `crc-32` — CRC-32 Checksum
- `expand-ipv6` — Expand IPv6
- `extract-ipv6` — Extract IPv6 addresses
- `file-hashes` — File hashes
- `filter-lines` — Filter lines
- `from-data-uri` — From Data URI
- `from-utf16le` — From UTF-16LE
- `from-uuencode` — From UUEncode
- `generate-key` — Generate AES key
- `generate-iv` — Generate IV
- `generate-password` — Generate password
- `random-bytes` — Generate random bytes
- `json-escape` — JSON Escape
- `json-unescape` — JSON Unescape
- `jwt-verify-shape` — JWT Inspect
- `list-zip` — List ZIP contents
- `cidr-range` — Parse CIDR
- `parse-elf` — Parse ELF header
- `image-info` — Parse image
- `parse-pe` — Parse PE header
- `parse-query-string` — Parse query string
- `parse-timestamp` — Parse Timestamp
- `primality-test` — Primality test
- `rot` — ROT
- `sha-384` — SHA-384
- `sha-512` — SHA-512
- `sort-json-keys` — Sort JSON keys
- `strip-comments` — Strip comments
- `substitution` — Substitution Cipher
- `to-data-uri` — To Data URI
- `to-hex-latin1` — To Hex (bytes)
- `to-html-entity-all` — To HTML Entity (all)
- `to-uuencode` — To UUEncode
- `trim-lines` — Trim lines
