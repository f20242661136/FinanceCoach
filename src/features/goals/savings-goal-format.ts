export function
formatGoalProgressPercent(
  basisPoints: string,
): string {
  const value =
    BigInt(
      basisPoints,
    );

  const whole =
    value
      / BigInt(100);

  const decimal =
    value
      % BigInt(100);


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


export function
goalProgressWidth(
  basisPoints: string,
): `${number}%` {
  const value =
    BigInt(
      basisPoints,
    );

  const clamped =
    value < BigInt(0)
      ? BigInt(0)
      : value > BigInt(10000)
        ? BigInt(10000)
        : value;


  return `${
    Number(
      clamped,
    )
    / 100
  }%`;
}