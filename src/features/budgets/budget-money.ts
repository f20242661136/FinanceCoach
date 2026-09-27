export function
parseDecimalToMinor(
  value: string,
  minorUnit: number,
): string {
  const cleaned =
    value
      .trim()
      .replace(
        /,/g,
        '',
      );

  if (
    !/^\d+(?:\.\d+)?$/.test(
      cleaned,
    )
  ) {
    throw new Error(
      'Enter a valid positive amount.',
    );
  }

  const [
    whole,
    fraction = '',
  ] =
    cleaned.split('.');

  if (
    fraction.length >
    minorUnit
  ) {
    throw new Error(
      `This currency supports at most ${minorUnit} decimal places.`,
    );
  }

  const scale =
    BigInt(10)
      ** BigInt(
        minorUnit,
      );

  const fractionMinor =
    minorUnit === 0
      ? BigInt(0)
      : BigInt(
          fraction.padEnd(
            minorUnit,
            '0',
          ),
        );

  const result =
    BigInt(whole)
      * scale
      + fractionMinor;

  if (
    result <= BigInt(0)
  ) {
    throw new Error(
      'Budget limit must be greater than zero.',
    );
  }

  return result.toString();
}

export function
formatMinor(
  value: string,
  minorUnit: number,
): string {
  const negative =
    value.startsWith('-');

  const digits =
    negative
      ? value.slice(1)
      : value;

  const padded =
    digits.padStart(
      minorUnit + 1,
      '0',
    );

  const whole =
    minorUnit === 0
      ? padded
      : padded.slice(
          0,
          -minorUnit,
        );

  const fraction =
    minorUnit === 0
      ? ''
      : padded.slice(
          -minorUnit,
        );

  const grouped =
    whole.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      ',',
    );

  const formatted =
    minorUnit === 0
      ? grouped
      : `${grouped}.${fraction}`;

  return negative
    ? `-${formatted}`
    : formatted;
}

export function
formatUsagePercent(
  basisPoints: string,
): string {
  const value =
    BigInt(
      basisPoints,
    );

  const whole =
    value / BigInt(100);

  const decimal =
    value % BigInt(100);

  if (
    decimal === BigInt(0)
  ) {
    return `${whole.toString()}%`;
  }

  const decimalText =
    decimal
      .toString()
      .padStart(
        2,
        '0',
      )
      .replace(
        /0+$/,
        '',
      );

  return `${whole.toString()}.${decimalText}%`;
}