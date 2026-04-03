import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import OtpCodeInput from '@/components/auth/OtpCodeInput';

function StatefulOtpInput() {
  const [value, setValue] = useState('');
  return <OtpCodeInput value={value} onChange={setValue} />;
}

describe('OtpCodeInput', () => {
  it('accepts numeric input and advances focus', async () => {
    const user = userEvent.setup();

    render(<StatefulOtpInput />);

    const firstDigit = screen.getByLabelText('OTP digit 1');
    const secondDigit = screen.getByLabelText('OTP digit 2');

    await user.type(firstDigit, '1');

    expect(firstDigit).toHaveValue('1');
    expect(secondDigit).toHaveFocus();
  });

  it('fills the code from paste input', async () => {
    const user = userEvent.setup();

    render(<StatefulOtpInput />);

    const firstDigit = screen.getByLabelText('OTP digit 1');
    await user.click(firstDigit);
    await user.paste('123456');

    expect(screen.getByLabelText('OTP digit 1')).toHaveValue('1');
    expect(screen.getByLabelText('OTP digit 2')).toHaveValue('2');
    expect(screen.getByLabelText('OTP digit 3')).toHaveValue('3');
    expect(screen.getByLabelText('OTP digit 4')).toHaveValue('4');
    expect(screen.getByLabelText('OTP digit 5')).toHaveValue('5');
    expect(screen.getByLabelText('OTP digit 6')).toHaveValue('6');
  });
});
