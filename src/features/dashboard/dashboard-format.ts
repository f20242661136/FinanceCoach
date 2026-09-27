export function
formatBasisPoints(
  basisPoints:
    number
    | null,
): string {
  if (
    basisPoints === null
  ) {
    return '—';
  }


  const negative =
    basisPoints < 0;

  const absolute =
    Math.abs(
      basisPoints,
    );

  const whole =
    Math.trunc(
      absolute / 100,
    );

  const decimal =
    absolute % 100;


  const value =
    decimal === 0
      ? `${whole}%`
      : `${
          whole
        }.${
          String(
            decimal,
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


  return negative
    ? `-${value}`
    : value;
}


export function
monthDisplayLabel(
  monthStart: string,
): string {
  const match =
    /^(\d{4})-(\d{2})-\d{2}$/
      .exec(
        monthStart,
      );


  if (!match) {
    return monthStart;
  }


  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];


  const monthIndex =
    Number(
      match[2],
    )
    - 1;


  return `${
    monthNames[
      monthIndex
    ]
    ?? match[2]
  } ${match[1]}`;
}