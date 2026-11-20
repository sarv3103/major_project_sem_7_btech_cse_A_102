import React, { useState } from 'react';

interface RazorpayCheckoutButtonProps {
  amount?: number; // in INR
  currency?: string;
  policyId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  onSuccess?: (paymentData: any) => void;
  onFailure?: (error: any) => void;
  buttonText?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const RazorpayCheckoutButton: React.FC<RazorpayCheckoutButtonProps> = ({
  amount = 1.0,
  currency = 'INR',
  policyId,
  customerName = 'Valued Customer',
  customerEmail = 'customer@example.com',
  customerPhone = '9876543210',
  onSuccess,
  onFailure,
  buttonText = 'Pay Now with Razorpay',
  className,
  style
}) => {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handlePayment = async () => {
    setLoading(true);
    setStatusMessage(null);

    try {
      // Step 1: Call Backend to Create Order
      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // in paise (min 100)
          amount_inr: amount,
          currency,
          policy_id: policyId,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone
        })
      });

      if (!orderRes.ok) {
        throw new Error('Failed to create Razorpay order');
      }

      const orderData = await orderRes.json();
      const { order_id, key_id, amount: orderAmount } = orderData;

      // Step 2: Open Razorpay Standard Checkout
      if (!(window as any).Razorpay) {
        throw new Error('Razorpay SDK not loaded. Please ensure checkout.js is included.');
      }

      const options = {
        key: key_id || (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || 'rzp_test_TixocUpKm9Az6k',
        amount: orderAmount || Math.round(amount * 100),
        currency: currency || 'INR',
        name: 'SecureWheels Insurance',
        description: `Secure Motor Coverage - ₹${amount}`,
        image: 'https://cdn-icons-png.flaticon.com/512/3209/3209994.png',
        order_id: order_id,
        handler: async (response: any) => {
          // Step 3: Call Backend to Verify Payment Signature
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                policy_id: policyId
              })
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.status === 'success') {
              setStatusMessage('Payment verified successfully!');
              if (onSuccess) onSuccess(verifyData);
            } else {
              throw new Error(verifyData.detail || 'Payment verification failed');
            }
          } catch (vErr: any) {
            setStatusMessage(`Verification Error: ${vErr.message}`);
            if (onFailure) onFailure(vErr);
          }
        },
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone
        },
        theme: {
          color: '#1F6FEB'
        },
        modal: {
          ondismiss: () => {
            setStatusMessage('Payment cancelled by user.');
            if (onFailure) onFailure({ reason: 'dismissed' });
          }
        }
      };

      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.on('payment.failed', (resp: any) => {
        setStatusMessage(`Payment Failed: ${resp.error?.description || 'Transaction failed'}`);
        if (onFailure) onFailure(resp.error);
      });
      razorpayInstance.open();

    } catch (err: any) {
      console.error('[Razorpay Checkout Error]:', err);
      setStatusMessage(err.message || 'Payment initiation failed');
      if (onFailure) onFailure(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handlePayment}
        disabled={loading}
        className={className}
        style={style || {
          background: 'linear-gradient(135deg, #1F6FEB 0%, #0F4C81 100%)',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '8px',
          padding: '12px 24px',
          fontSize: '15px',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(31, 111, 235, 0.25)',
          transition: 'all 0.2s ease'
        }}
      >
        💳 {loading ? 'Processing...' : buttonText}
      </button>
      {statusMessage && (
        <p style={{ marginTop: '8px', fontSize: '13px', color: statusMessage.includes('failed') || statusMessage.includes('Error') ? '#EF4444' : '#10B981' }}>
          {statusMessage}
        </p>
      )}
    </div>
  );
};
export default RazorpayCheckoutButton;
