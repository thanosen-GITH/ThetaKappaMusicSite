(function () {
  'use strict';

  const form = document.getElementById('vlq-form');
  if (!form) return;

  const input = document.getElementById('vlq-input');
  const help = document.getElementById('vlq-input-help');
  const error = document.getElementById('vlq-error');
  const decimalOutput = document.getElementById('vlq-decimal');
  const hexOutput = document.getElementById('vlq-hex');
  const binaryOutput = document.getElementById('vlq-binary');
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

  function showResult(value) {
    decimalOutput.value = value.toString(10);
    hexOutput.value = `0x${value.toString(16).toUpperCase()}`;
    binaryOutput.value = `0b${value.toString(2)}`;
  }

  function clearResult() {
    decimalOutput.value = '—';
    hexOutput.value = '—';
    binaryOutput.value = '—';
  }

  function decode() {
    try {
      const bytes = parseBytes(input.value, selectedFormat());
      showResult(decodeVlq(bytes));
      lastValidBytes = bytes;
      input.removeAttribute('aria-invalid');
      error.textContent = '';
      return true;
    } catch (decodeError) {
      clearResult();
      input.setAttribute('aria-invalid', 'true');
      error.textContent = decodeError.message;
      return false;
    }
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
})();
