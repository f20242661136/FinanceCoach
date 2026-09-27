export function
interestBasisPointsToPercent(
  basisPoints:
    number | null,
): string {
  if (
    basisPoints === null
  ) {
    return 'No interest rate';
  }


  const whole =
    Math.trunc(
      basisPoints
      / 100,
    );

  const fraction =
    Math.abs(
      basisPoints
      % 100,
    );


  if (
    fraction === 0
  ) {
    return `${whole}%`;
  }


  return `${
    whole
  }.${
    String(
      fraction,
    )
      .padStart(
        2,
        '0',
      )
      .replace(
        /0+$/,
        '',
      )
  }%`;
}


export function
percentTextToInterestBasisPoints(
  value: string,
): number | null {
  const cleaned =
    value
      .trim()
      .replace(
        /%$/,
        '',
      );


  if (!cleaned) {
    return null;
  }


  if (
    !/^\d+(?:\.\d{1,2})?$/.test(
      cleaned,
    )
  ) {
    throw new Error(
      'Interest rate can use up to two decimal places.',
    );
  }


  const [
    whole,
    fraction = '',
  ] =
    cleaned.split('.');


  const basisPoints =
    Number(
      BigInt(
        whole,
      )
      * BigInt(100)
      +
      BigInt(
        fraction.padEnd(
          2,
          '0',
        ),
      ),
    );


  if (
    !Number.isSafeInteger(
      basisPoints,
    )
    || basisPoints > 100000
  ) {
    throw new Error(
      'Interest rate is out of range.',
    );
  }


  return basisPoints;
}


export function
loanDirectionLabel(
  direction:
    'borrowed' | 'given',
): string {
  return direction ===
    'borrowed'
    ? 'I borrowed'
    : 'I gave';
}