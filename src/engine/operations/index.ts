import type { OperationDef } from '../types';
import { dataFormatOperations } from './dataFormat';
import { compressionOperations } from './compression';
import { cryptoOperations } from './crypto';
import { utilOperations } from './utils';
import { extractorOperations } from './extractors';
import { encodingOperations } from './encodings';
import { cipherOperations } from './ciphers';
import { hashingOperations } from './hashing';
import { symmetricOperations } from './symmetric';
import { textOperations } from './text';
import { networkOperations } from './network';
import { forensicsOperations } from './forensics';
import { structuredOperations } from './structured';
import { dateTimeOperations } from './datetime';
import { fileOperations } from './files';
import { flowOperations } from './flow';
import { arithmeticOperations } from './arithmetic';
import { checksumOperations } from './checksums';
import { digestOperations } from './digests';
import { keccakOperations } from './keccak';
import { blakeOperations } from './blake';
import { numberOperations } from './numbers';
import { alphabetOperations } from './alphabets';
import { wireOperations } from './wire';
import { charsetOperations } from './charsets';
import { casingOperations } from './casing';
import { unitOperations } from './units';
import { compareOperations } from './compare';
import { sequenceOperations } from './sequence';
import { codeTidyOperations } from './codeTidy';
import { binaryFormatOperations } from './binaryFormats';
import { asn1Operations } from './asn1';
import { packetOperations } from './packets';
import { tlsOperations } from './tls';
import { dateTimeFormatOperations } from './datetimeFormat';
import { markupOperations } from './markup';
import { extractTextOperations } from './extractText';
import { archiveOperations } from './archives';
import { classicalOperations } from './classical';
import { blockCipherOperations } from './blockCiphers';
import { streamCipherOperations } from './streamCiphers';
import { legacyCipherOperations } from './legacyCiphers';
import { kdfOperations } from './kdf';
import { passwordHashOperations } from './passwordHashes';
import { moreHashOperations } from './moreHashes';
import { magicOperations } from './magic';
import { yamlOperations } from './yaml';
import { amfOperations } from './amf';
import { avroOperations } from './avro';
import { enigmaOperations } from './enigma';
import { rotorMachineOperations } from './rotorMachines';
import { bombeOperations } from './bombe';
import { otpOperations } from './otp';
import { metadataOperations } from './metadata';
import { jokeOperations } from './jokes';
import { bzip2Operations } from './bzip2';
import { lzmaOperations } from './lzma';
import { xpressOperations } from './xpress';
import { whirlpoolOperations } from './whirlpool';
import { argon2Operations } from './argon2';
import { imageOperations } from './images';
import { publicKeyOperations } from './publicKey';
import { tokenOperations } from './tokens';
import { twofishOperations } from './twofish';
import { binaryInspectOperations } from './binaryInspect';
import { geoOperations } from './geo';
import { primeOperations } from './primes';
import { chartOperations } from './charts';
import { fuzzyHashOperations } from './fuzzyHash';
import { lorenzOperations } from './lorenz';
import { yaraOperations } from './yara';
import { blake3Operations } from './blake3';
import { asconOperations } from './ascon';
import { pgpOperations } from './pgp';
import { gostOperations } from './gost';
import { provideRegistry } from './registryAccess';
import type { Operation } from './types';

/**
 * The operation registry. Adding an operation means adding it to one of the
 * modules above — it should never require touching the interface.
 */
export const OPERATIONS: Operation[] = [
  ...dataFormatOperations,
  ...compressionOperations,
  ...cryptoOperations,
  ...utilOperations,
  ...extractorOperations,
  ...encodingOperations,
  ...cipherOperations,
  ...hashingOperations,
  ...symmetricOperations,
  ...textOperations,
  ...networkOperations,
  ...forensicsOperations,
  ...structuredOperations,
  ...dateTimeOperations,
  ...fileOperations,
  ...flowOperations,
  ...arithmeticOperations,
  ...checksumOperations,
  ...digestOperations,
  ...keccakOperations,
  ...blakeOperations,
  ...numberOperations,
  ...alphabetOperations,
  ...wireOperations,
  ...charsetOperations,
  ...casingOperations,
  ...unitOperations,
  ...compareOperations,
  ...sequenceOperations,
  ...codeTidyOperations,
  ...binaryFormatOperations,
  ...asn1Operations,
  ...packetOperations,
  ...tlsOperations,
  ...dateTimeFormatOperations,
  ...markupOperations,
  ...extractTextOperations,
  ...archiveOperations,
  ...classicalOperations,
  ...blockCipherOperations,
  ...streamCipherOperations,
  ...legacyCipherOperations,
  ...kdfOperations,
  ...passwordHashOperations,
  ...moreHashOperations,
  ...magicOperations,
  ...yamlOperations,
  ...amfOperations,
  ...avroOperations,
  ...enigmaOperations,
  ...rotorMachineOperations,
  ...bombeOperations,
  ...otpOperations,
  ...metadataOperations,
  ...jokeOperations,
  ...bzip2Operations,
  ...lzmaOperations,
  ...xpressOperations,
  ...whirlpoolOperations,
  ...argon2Operations,
  ...imageOperations,
  ...publicKeyOperations,
  ...tokenOperations,
  ...twofishOperations,
  ...binaryInspectOperations,
  ...geoOperations,
  ...primeOperations,
  ...chartOperations,
  ...fuzzyHashOperations,
  ...lorenzOperations,
  ...yaraOperations,
  ...blake3Operations,
  ...asconOperations,
  ...pgpOperations,
  ...gostOperations,
];

const BY_ID = new Map(OPERATIONS.map((op) => [op.id, op]));

export function getOperation(id: string): Operation | undefined {
  return BY_ID.get(id);
}

/** Operations that can participate in automatic detection, most specific first. */
export const DETECTABLE: Operation[] = OPERATIONS.filter((op) => op.detection).sort((a, b) => {
  const specificity = (op: Operation) =>
    (op.detection?.magic ? 3 : 0) + (op.detection?.pattern ? 1 : 0);
  return specificity(b) - specificity(a);
});

// Handed over so detection, and an operation that runs other operations, can
// reach the registry without importing this module back — which would be a
// cycle, since this module is built by importing all of them.
provideRegistry((id) => BY_ID.get(id), DETECTABLE);

export { CATEGORY_ORDER } from './categories';

export function publicDefinitions(): OperationDef[] {
  return OPERATIONS.map(({ id, name, category, description, aliases, args, isFlowControl }) => ({
    id,
    name,
    category,
    description,
    aliases,
    ...(isFlowControl ? { isFlowControl } : {}),
    // Cloned so a step editing its arguments cannot mutate the registry.
    args: args.map((a) => ({ ...a })),
  }));
}
