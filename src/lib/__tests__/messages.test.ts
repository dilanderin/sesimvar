import { describe, expect, it } from 'vitest';
import { isValidAddress, normalizeAddress, sentenceText, smsUrl } from '../messages';

describe('Gönder → Messages', () => {
  it('writes the sentence with a capital first letter (Turkish İ)', () => {
    expect(sentenceText([{ say: 'istiyorum' }, { say: 'su' }])).toBe('İstiyorum su');
    expect(sentenceText([{ say: 'Dilan' }, { say: 'eve' }, { say: 'gel' }])).toBe('Dilan eve gel');
  });

  it('accepts phone numbers and iMessage e-mails, rejects junk', () => {
    expect(isValidAddress('+90 532 123 45 67')).toBe(true);
    expect(isValidAddress('0532-123-45-67')).toBe(true);
    expect(isValidAddress('ornek@icloud.com')).toBe(true);
    expect(isValidAddress('')).toBe(false);
    expect(isValidAddress('anne')).toBe(false);
    expect(normalizeAddress(' +90 (532) 123-45-67 ')).toBe('+905321234567');
  });

  it('builds the Messages link for Apple devices and others', () => {
    expect(smsUrl('+90 532 123 45 67', 'İstiyorum su', true)).toBe('sms:+905321234567&body=%C4%B0stiyorum%20su');
    expect(smsUrl('ornek@icloud.com', 'Tamam', false)).toBe('sms:ornek@icloud.com?body=Tamam');
  });
});
