export function
basisPointsToPercentText(
  basisPoints: string,
): string {
  const value =
    BigInt(
      basisPoints,
    );

  const whole =
    value
      / BigInt(100);

  const fraction =
    value
      % BigInt(100);


  if (
    fraction === BigInt(0)
  ) {
    return `${whole.toString()}%`;
  }


  return `${
    whole.toString()
  }.${
    fraction
      .toString()
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
percentTextToBasisPoints(
  value: string,
): string {
  const cleaned =
    value
      .trim()
      .replace(
        /%$/,
        '',
      );


  if (
    !/^\d+(?:\.\d{1,2})?$/.test(
      cleaned,
    )
  ) {
    throw new Error(
      'Enter a percentage with up to two decimal places.',
    );
  }


  const [
    whole,
    fraction = '',
  ] =
    cleaned.split('.');


  const basisPoints =
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
    );


  if (
    basisPoints <= BigInt(0)
    || basisPoints > BigInt(10000)
  ) {
    throw new Error(
      'Percentage must be greater than 0 and at most 100.',
    );
  }


  return basisPoints
    .toString();
}


export function
sumBasisPoints(
  values: string[],
): string {
  return values
    .reduce(
      (
        total,
        value,
      ) =>
        total
        +
        BigInt(
          value,
        ),
      BigInt(0),
    )
    .toString();
}