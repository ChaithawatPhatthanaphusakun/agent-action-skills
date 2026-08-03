// Pure routing logic: parse fixArgs and return a decision object.
// Never prints or exits — cli.js handles those.

module.exports = function resolveFixMode(fixArgs) {
  const DATE_PATTERN = /^\d{2}\/\d{2}\/\d{4}$/;
  const FIELD_FLAGS = ['--invoice', '--receipt', '--due', '--date-paid', '--title', '--logo', '--line'];

  if (!fixArgs || fixArgs.length === 0) {
    return {
      mode: 'error',
      message: 'No fix arguments provided',
    };
  }

  const secondArg = fixArgs[0];
  const isDate = DATE_PATTERN.test(secondArg);
  const hasFieldFlags = fixArgs.some((a) => FIELD_FLAGS.includes(a));

  const isFlag = secondArg.startsWith('-');
  const hasPositionalAddress = !isDate && !isFlag;
  const hasAddressAndDate =
    hasPositionalAddress &&
    fixArgs.length === 2 &&
    DATE_PATTERN.test(fixArgs[1]);

  if (hasPositionalAddress && (hasFieldFlags || hasAddressAndDate)) {
    // Combined mode: address rewrite + field fixes.
    const firstFlagIdx = fixArgs.findIndex((a) => a.startsWith('-'));
    const positionalTokens =
      firstFlagIdx === -1 ? fixArgs : fixArgs.slice(0, firstFlagIdx);
    const flagArgs =
      firstFlagIdx === -1 ? [] : fixArgs.slice(firstFlagIdx);
    const address = positionalTokens[0];
    const optionalDate = positionalTokens[1];

    if (
      positionalTokens.length > 2 ||
      (optionalDate !== undefined && !DATE_PATTERN.test(optionalDate))
    ) {
      return {
        mode: 'error',
        message:
          'address must be wrapped in quotation marks (multiple unquoted words before flags)',
      };
    }

    return {
      mode: 'combined',
      address,
      date: optionalDate,
      flagArgs,
    };
  } else if (isDate || hasFieldFlags) {
    // Fields mode: only field fixes (--due, --invoice, etc. or a bare date).
    const extraFlags = fixArgs.slice(1);
    return {
      mode: 'fields',
      firstArg: secondArg,
      extraFlags,
    };
  } else {
    // Address mode: just the address, no flags.
    if (fixArgs.length > 1) {
      return {
        mode: 'error',
        message: 'address must be wrapped in quotation marks (multiple unquoted words)',
      };
    }

    return {
      mode: 'address',
      address: secondArg,
    };
  }
};
