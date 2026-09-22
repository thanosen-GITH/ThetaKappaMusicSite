(function () {
  'use strict';

  const form = document.getElementById('vlq-form');
  if (!form) return;

  const input = document.getElementById('vlq-input');
  const ppqInput = document.getElementById('vlq-ppq');
  const help = document.getElementById('vlq-input-help');
  const error = document.getElementById('vlq-error');
  const decimalOutput = document.getElementById('vlq-decimal');
  const hexOutput = document.getElementById('vlq-hex');
  const binaryOutput = document.getElementById('vlq-binary');
  const durationOutput = document.getElementById('vlq-duration');
  const formatInputs = Array.from(form.elements['vlq-format']);
  let lastValidBytes = [0x81, 0x00];

  const formatSettings = {
    hex: {
      placeholder: '81 00',
      help: 'Enter hexadecimal bytes, separated by spaces, or as one compact value (for example, 81 00 or 8100).'
    },
    binary: {
      placeholder: '10000001 00000000',
      help: 'Enter eight-bit binary bytes, separated by spaces, or as one compact value.'
    },
    decimal: {
      placeholder: '129 0 or 33024',
      help: 'Enter decimal bytes separated by spaces (129 0), or the encoded bytes as one packed decimal value (33024).'
    }
  };

  function selectedFormat() {
    return formatInputs.find((radio) => radio.checked).value;
  }

  function splitPrefixedBytes(value, prefixPattern) {
    return value
      .trim()
      .replace(prefixPattern, '')
      .split(/[\s,;:\-]+/)
      .filter(Boolean);
  }

  function parseHex(value) {
    const trimmed = value.trim();
    const hasSeparators = /[\s,;:\-]/.test(trimmed);
    const parts = splitPrefixedBytes(trimmed, /0x/gi);

    if (parts.length === 0) throw new Error('Enter a VLQ value to decode.');
    if (parts.some((part) => !/^[0-9a-f]+$/i.test(part))) {
      throw new Error('Hex input can contain only digits 0–9 and letters A–F.');
    }

    if (hasSeparators || parts.length > 1) {
      if (parts.some((part) => part.length > 2)) {
        throw new Error('Each separated hexadecimal byte must contain one or two digits.');
      }
      return parts.map((part) => Number.parseInt(part, 16));
    }

    const compact = parts[0];
    if (compact.length % 2 !== 0) {
      if (compact.length <= 2) return [Number.parseInt(compact, 16)];
      throw new Error('Compact hexadecimal input must contain complete two-digit bytes.');
    }

    return compact.match(/.{2}/g).map((part) => Number.parseInt(part, 16));
  }

  function parseBinary(value) {
    const trimmed = value.trim();
    const hasSeparators = /[\s,;:\-]/.test(trimmed);
    const parts = splitPrefixedBytes(trimmed, /0b/gi);

    if (parts.length === 0) throw new Error('Enter a VLQ value to decode.');
    if (parts.some((part) => !/^[01]+$/.test(part))) {
      throw new Error('Binary input can contain only zeros and ones.');
    }

    if (hasSeparators || parts.length > 1) {
      if (parts.some((part) => part.length > 8)) {
        throw new Error('Each separated binary byte must contain no more than eight bits.');
      }
      return parts.map((part) => Number.parseInt(part, 2));
    }

    const compact = parts[0];
    if (compact.length <= 8) return [Number.parseInt(compact, 2)];
    if (compact.length % 8 !== 0) {
      throw new Error('Compact binary input must contain complete eight-bit bytes.');
    }

    return compact.match(/.{8}/g).map((part) => Number.parseInt(part, 2));
  }

  function parseDecimal(value) {
    if (/^\s*-/.test(value)) {
      throw new Error('Decimal input cannot be negative.');
    }

    const parts = value.trim().split(/[\s,;:\-]+/).filter(Boolean);
    if (parts.length === 0) throw new Error('Enter a VLQ value to decode.');
    if (parts.some((part) => !/^\d+$/.test(part))) {
      throw new Error('Decimal input must contain whole numbers separated into bytes.');
    }

    const bytes = parts.map(Number);
    if (bytes.length === 1 && bytes[0] > 255) {
      if (bytes[0] > 0xffffffff) {
        throw new Error('A packed decimal MIDI VLQ cannot exceed four bytes (4,294,967,295).');
      }

      const packedBytes = [];
      let remaining = bytes[0];
      while (remaining > 0) {
        packedBytes.unshift(remaining % 256);
        remaining = Math.floor(remaining / 256);
      }
      return packedBytes;
    }

    if (bytes.some((byte) => byte > 255)) {
      throw new Error('Each decimal byte must be between 0 and 255.');
    }
    return bytes;
  }

  function parseBytes(value, format) {
    if (format === 'binary') return parseBinary(value);
    if (format === 'decimal') return parseDecimal(value);
    return parseHex(value);
  }

  function decodeVlq(bytes) {
    if (bytes.length > 4) {
      throw new Error('A standard MIDI VLQ can contain at most four bytes.');
    }

    bytes.forEach((byte, index) => {
      const isLast = index === bytes.length - 1;
      const hasContinuation = (byte & 0x80) !== 0;

      if (!isLast && !hasContinuation) {
        const following = bytes.length - index - 1;
        throw new Error(`Byte ${index + 1} ends the VLQ, so the following byte${following === 1 ? '' : 's'} cannot be decoded as part of it.`);
      }
      if (isLast && hasContinuation) {
        throw new Error('The final byte says another byte follows. Add the missing byte.');
      }
    });

    return bytes.reduce((result, byte) => (result * 128) + (byte & 0x7f), 0);
  }

  function parsePpq(value) {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) {
      throw new Error('PPQ must be a positive whole number.');
    }

    const ppq = Number(trimmed);
    if (!Number.isSafeInteger(ppq) || ppq < 1) {
      throw new Error('PPQ must be a positive whole number.');
    }
    return ppq;
  }

  function formatDuration(value, ppq) {
    const duration = value / ppq;
    if (Number.isInteger(duration)) return duration.toFixed(1);
    return duration.toFixed(10).replace(/0+$/, '');
  }

  function showDecodedValue(value) {
    decimalOutput.value = value.toString(10);
    hexOutput.value = `0x${value.toString(16).toUpperCase()}`;
    binaryOutput.value = `0b${value.toString(2)}`;
  }

  function clearDecodedValue() {
    decimalOutput.value = '—';
    hexOutput.value = '—';
    binaryOutput.value = '—';
    durationOutput.value = '—';
  }

  function decode() {
    let bytes;
    let value;
    let ppq;
    let validationMessage = '';

    try {
      bytes = parseBytes(input.value, selectedFormat());
      value = decodeVlq(bytes);
      showDecodedValue(value);
      lastValidBytes = bytes;
      input.removeAttribute('aria-invalid');
    } catch (decodeError) {
      clearDecodedValue();
      input.setAttribute('aria-invalid', 'true');
      validationMessage = decodeError.message;
    }

    try {
      ppq = parsePpq(ppqInput.value);
      ppqInput.removeAttribute('aria-invalid');
    } catch (ppqError) {
      ppqInput.setAttribute('aria-invalid', 'true');
      if (!validationMessage) validationMessage = ppqError.message;
    }

    durationOutput.value = value === undefined || ppq === undefined
      ? '—'
      : formatDuration(value, ppq);
    error.textContent = validationMessage;
    return validationMessage === '';
  }

  function bytesToFormat(bytes, format) {
    if (format === 'binary') return bytes.map((byte) => byte.toString(2).padStart(8, '0')).join(' ');
    if (format === 'decimal') return bytes.join(' ');
    return bytes.map((byte) => byte.toString(16).toUpperCase().padStart(2, '0')).join(' ');
  }

  function updateFormat() {
    const format = selectedFormat();
    const settings = formatSettings[format];
    input.placeholder = settings.placeholder;
    help.textContent = settings.help;
    input.value = bytesToFormat(lastValidBytes, format);
    decode();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    decode();
  });

  input.addEventListener('input', decode);
  ppqInput.addEventListener('input', decode);
  formatInputs.forEach((radio) => radio.addEventListener('change', updateFormat));

  document.querySelectorAll('[data-bytes]').forEach((button) => {
    button.addEventListener('click', () => {
      const bytes = button.dataset.bytes.split(' ').map((byte) => Number.parseInt(byte, 16));
      input.value = bytesToFormat(bytes, selectedFormat());
      decode();
      input.focus();
    });
  });

  decode();

  const encodeForm = document.getElementById('vlq-encode-form');
  if (!encodeForm) return;

  const encodeInput = document.getElementById('vlq-encode-input');
  const encodeInputLabel = document.getElementById('vlq-encode-input-label');
  const encodePpqInput = document.getElementById('vlq-encode-ppq');
  const encodeHelp = document.getElementById('vlq-encode-input-help');
  const encodeError = document.getElementById('vlq-encode-error');
  const encodedDecimalOutput = document.getElementById('vlq-encoded-decimal');
  const encodedHexOutput = document.getElementById('vlq-encoded-hex');
  const encodedBinaryOutput = document.getElementById('vlq-encoded-binary');
  const encodeFormatInputs = Array.from(encodeForm.elements['vlq-encode-format']);
  const maxMidiVlq = 0x0fffffff;
  let lastEncodeTicks = 9600;

  const encodeFormatSettings = {
    hex: {
      label: 'Value to encode',
      placeholder: '2580',
      inputMode: 'text',
      help: 'Enter the normal unsigned integer in hexadecimal (for example, 2580).'
    },
    binary: {
      label: 'Value to encode',
      placeholder: '100101100000000',
      inputMode: 'text',
      help: 'Enter the normal unsigned integer in binary.'
    },
    decimal: {
      label: 'Value to encode',
      placeholder: '9600',
      inputMode: 'numeric',
      help: 'Enter the normal decimal integer that you want to encode as a MIDI VLQ.'
    },
    duration: {
      label: 'Duration in quarter notes',
      placeholder: '1.0',
      inputMode: 'decimal',
      help: 'Enter a non-negative quarter-note duration. Fractional tick results are rounded to the nearest whole tick.'
    }
  };

  function selectedEncodeFormat() {
    return encodeFormatInputs.find((radio) => radio.checked).value;
  }

  function parseUnsignedInteger(value, format) {
    let normalized = value.trim();
    if (format === 'hex') normalized = normalized.replace(/^0x/i, '');
    if (format === 'binary') normalized = normalized.replace(/^0b/i, '');

    const patterns = {
      hex: /^[0-9a-f]+$/i,
      binary: /^[01]+$/,
      decimal: /^\d+$/
    };

    if (!normalized) throw new Error('Enter a value to encode.');
    if (!patterns[format].test(normalized)) {
      const formatName = format === 'hex' ? 'Hexadecimal' : `${format[0].toUpperCase()}${format.slice(1)}`;
      throw new Error(`${formatName} input contains invalid characters.`);
    }

    const radix = format === 'hex' ? 16 : format === 'binary' ? 2 : 10;
    return Number.parseInt(normalized, radix);
  }

  function parseDurationTicks(value, ppq) {
    const normalized = value.trim();
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
      throw new Error('Duration must be a non-negative decimal number.');
    }

    return Math.round(Number(normalized) * ppq);
  }

  function validateEncodeRange(value) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error('The value must be a non-negative whole number.');
    }
    if (value > maxMidiVlq) {
      throw new Error('A standard four-byte MIDI VLQ cannot exceed 268,435,455.');
    }
    return value;
  }

  function encodeVlq(value) {
    const bytes = [value & 0x7f];
    let remaining = Math.floor(value / 128);

    while (remaining > 0) {
      bytes.unshift((remaining & 0x7f) | 0x80);
      remaining = Math.floor(remaining / 128);
    }
    return bytes;
  }

  function showEncodedBytes(bytes) {
    encodedDecimalOutput.value = bytes.join(' ');
    encodedHexOutput.value = bytes.map((byte) => byte.toString(16).toUpperCase().padStart(2, '0')).join(' ');
    encodedBinaryOutput.value = bytes.map((byte) => byte.toString(2).padStart(8, '0')).join(' ');
  }

  function clearEncodedBytes() {
    encodedDecimalOutput.value = '—';
    encodedHexOutput.value = '—';
    encodedBinaryOutput.value = '—';
  }

  function encode() {
    const format = selectedEncodeFormat();
    let ppq;

    if (format === 'duration') {
      try {
        ppq = parsePpq(encodePpqInput.value);
        encodePpqInput.removeAttribute('aria-invalid');
      } catch (ppqError) {
        clearEncodedBytes();
        encodePpqInput.setAttribute('aria-invalid', 'true');
        encodeError.textContent = ppqError.message;
        return false;
      }
    } else {
      encodePpqInput.removeAttribute('aria-invalid');
    }

    try {
      const value = format === 'duration'
        ? parseDurationTicks(encodeInput.value, ppq)
        : parseUnsignedInteger(encodeInput.value, format);
      const ticks = validateEncodeRange(value);
      showEncodedBytes(encodeVlq(ticks));
      lastEncodeTicks = ticks;
      encodeInput.removeAttribute('aria-invalid');
      encodeError.textContent = '';
      return true;
    } catch (valueError) {
      clearEncodedBytes();
      encodeInput.setAttribute('aria-invalid', 'true');
      encodeError.textContent = valueError.message;
      return false;
    }
  }

  function ticksToEncodeFormat(ticks, format, ppq) {
    if (format === 'hex') return ticks.toString(16).toUpperCase();
    if (format === 'binary') return ticks.toString(2);
    if (format === 'duration') {
      const duration = ticks / ppq;
      return Number.isInteger(duration) ? duration.toFixed(1) : duration.toString();
    }
    return ticks.toString(10);
  }

  function updateEncodeFormat() {
    const format = selectedEncodeFormat();
    const settings = encodeFormatSettings[format];
    let ppq = 9600;

    try {
      ppq = parsePpq(encodePpqInput.value);
    } catch (_) {
      encodePpqInput.value = '9600';
    }

    encodeInputLabel.textContent = settings.label;
    encodeInput.placeholder = settings.placeholder;
    encodeInput.inputMode = settings.inputMode;
    encodeHelp.textContent = settings.help;
    encodePpqInput.disabled = format !== 'duration';
    encodeInput.value = ticksToEncodeFormat(lastEncodeTicks, format, ppq);
    encode();
  }

  encodeForm.addEventListener('submit', (event) => {
    event.preventDefault();
    encode();
  });

  encodeInput.addEventListener('input', encode);
  encodePpqInput.addEventListener('input', encode);
  encodeFormatInputs.forEach((radio) => radio.addEventListener('change', updateEncodeFormat));

  document.querySelectorAll('[data-encode-value]').forEach((button) => {
    button.addEventListener('click', () => {
      const ticks = Number(button.dataset.encodeValue);
      let ppq = 9600;

      try {
        ppq = parsePpq(encodePpqInput.value);
      } catch (_) {
        encodePpqInput.value = '9600';
      }

      encodeInput.value = ticksToEncodeFormat(ticks, selectedEncodeFormat(), ppq);
      encode();
      encodeInput.focus();
    });
  });

  encode();
})();
