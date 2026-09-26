export class MoneyInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyInputError';
  }
}

function assertMinorUnit(
  minorUnit: number,
): void {
  if (
    !Number.isInteger(minorUnit) ||
    minorUnit < 0 ||
    minorUnit > 4
  ) {
    throw new MoneyInputError(
      'Unsupported currency precision.',
    );
  }
}

export function parseAmountToMinor(
  rawValue: string,
  minorUnit: number,
): string {
  assertMinorUnit(minorUnit);

  const value = rawValue.trim();

  if (!value) {
    throw new MoneyInputError(
      'Enter an amount.',
    );
  }

  if (!/^\d+(?:[.,]\d+)?$/.test(value)) {
    throw new MoneyInputError(
      'Enter a valid amount.',
    );
  }

  const normalized =
    value.replace(',', '.');

  const [
    wholePart,
    fractionPart = '',
  ] = normalized.split('.');

  if (
    fractionPart.length >
    minorUnit
  ) {
    throw new MoneyInputError(
      `Use no more than ${minorUnit} decimal places.`,
    );
  }

  const fraction =
    fractionPart.padEnd(
      minorUnit,
      '0',
    );

  const combined =
    `${wholePart}${fraction}`
      .replace(
        /^0+(?=\d)/,
        '',
      ) || '0';

  const amount =
    BigInt(combined);

  if (amount <= 0n) {
    throw new MoneyInputError(
      'Amount must be greater than zero.',
    );
  }

  return amount.toString();
}

export function parseOpeningAmountToMinor(
  rawValue: string,
  minorUnit: number,
): string {
  assertMinorUnit(minorUnit);

  const trimmed =
    rawValue.trim();

  if (!trimmed) {
    return '0';
  }

  if (
    !/^\d+(?:[.,]\d+)?$/.test(
      trimmed,
    )
  ) {
    throw new MoneyInputError(
      'Enter a valid opening balance.',
    );
  }

  const normalized =
    trimmed.replace(',', '.');

  const [
    wholePart,
    fractionPart = '',
  ] = normalized.split('.');

  if (
    fractionPart.length >
    minorUnit
  ) {
    throw new MoneyInputError(
      `Use no more than ${minorUnit} decimal places.`,
    );
  }

  const fraction =
    fractionPart.padEnd(
      minorUnit,
      '0',
    );

  return (
    `${wholePart}${fraction}`
      .replace(
        /^0+(?=\d)/,
        '',
      ) || '0'
  );
}

function separatorsForLocale(
  locale: string,
): {
  group: string;
  decimal: string;
} {
  const parts =
    new Intl.NumberFormat(
      locale,
    ).formatToParts(1000.1);

  return {
    group:
      parts.find(
        (part) =>
          part.type === 'group',
      )?.value ?? ',',

    decimal:
      parts.find(
        (part) =>
          part.type === 'decimal',
      )?.value ?? '.',
  };
}

function groupDigits(
  digits: string,
  separator: string,
): string {
  return digits.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    separator,
  );
}

export function formatMinorUnits(
  minorValue: string,
  currencyCode: string,
  minorUnit: number,
  locale = 'en',
): string {
  assertMinorUnit(minorUnit);

  let value =
    BigInt(minorValue);

  const negative =
    value < 0n;

  if (negative) {
    value = -value;
  }

  const digits =
    value.toString();

  const padded =
    minorUnit > 0
      ? digits.padStart(
          minorUnit + 1,
          '0',
        )
      : digits;

  const whole =
    minorUnit > 0
      ? padded.slice(
          0,
          -minorUnit,
        )
      : padded;

  const fraction =
    minorUnit > 0
      ? padded.slice(
          -minorUnit,
        )
      : '';

  const {
    group,
    decimal,
  } = separatorsForLocale(
    locale,
  );

  const formattedWhole =
    groupDigits(
      whole,
      group,
    );

  const formatted =
    minorUnit > 0
      ? `${formattedWhole}${decimal}${fraction}`
      : formattedWhole;

  return `${
    negative ? '-' : ''
  }${currencyCode} ${formatted}`;
}