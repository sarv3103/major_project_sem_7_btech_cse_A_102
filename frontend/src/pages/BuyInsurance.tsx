import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { Car, ShieldCheck, CreditCard, Sparkles, AlertCircle, CheckCircle2, ArrowRight, Download, Lock, Unlock, Edit2, Zap, Bike, Info, FileText, Check, AlertTriangle } from 'lucide-react';
import { useAuth } from '../components/AuthContext';

interface InsuranceProduct {
  id: string;
  name: string;
  vehicle_type: string;
  plan_type: string;
  description: string;
  base_rate: number;
  deductible: number;
  coverage_summary: string;
  is_active: number;
}

interface VehicleCatalogItem {
  id: number;
  vehicle_type: string;
  manufacturer: string;
  model: string;
  variant: string;
  fuel_type: string;
  ex_showroom_price: number;
  engine_cc: number;
  seating_capacity: number;
}

export const BuyInsurance: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Products from dynamic catalog
  const [products, setProducts] = useState<InsuranceProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productsLoading, setProductsLoading] = useState(true);

  // Vehicle Master Catalog from backend
  const [vehicleCatalog, setVehicleCatalog] = useState<VehicleCatalogItem[]>([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<'Car' | 'Two-Wheeler' | 'Electric Vehicle'>('Car');

  // Vehicle Form
  const [regNo, setRegNo] = useState('');
  const [vehType, setVehType] = useState('Car');
  const [fuelType, setFuelType] = useState('Petrol');
  const [make, setMake] = useState('Honda');
  const [modelName, setModelName] = useState('City ZX');
  const [year, setYear] = useState(2023);
  const [exShowroom, setExShowroom] = useState(1350000);
  const [declaredIdv, setDeclaredIdv] = useState(945000);
  const [mobileNumber, setMobileNumber] = useState(user?.mobile || '');
  const [duration, setDuration] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any>(null);

  // Validation & Field Customization States
  const [regPlateTouched, setRegPlateTouched] = useState(false);
  const [mobileTouched, setMobileTouched] = useState(false);
  const [isCustomExShowroom, setIsCustomExShowroom] = useState(false);
  const [activePolicyConflict, setActivePolicyConflict] = useState<any>(null);
  const [checkingPlate, setCheckingPlate] = useState(false);

  // Real-time Indian Vehicle Registration Plate Validator (RTO Standard & Bharat BH Series)
  const validatePlateNumber = (plate: string) => {
    const clean = plate.replace(/[\s-]/g, '').toUpperCase();
    if (!clean) {
      return { valid: false, error: 'Registration plate number is required.' };
    }
    // Strict Indian RTO Pattern:
    // 1. Standard: 2-Letter Valid State Code + 1-2 Digit District Code + 1-3 Letter Series + Exactly 4 Digits
    // 2. Bharat (BH) Series: 2 Digits + BH + 4 Digits + 1-2 Letters
    const validStates = '(?:AN|AP|AR|AS|BR|CG|CH|DD|DL|DN|GA|GJ|HR|HP|JH|JK|KA|KL|LA|LD|MP|MH|MN|ML|MZ|NL|OD|PB|PY|RJ|SK|TN|TR|TS|UK|UP|WB)';
    const rtoPattern = new RegExp(`^(${validStates}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2})$`);
    if (!rtoPattern.test(clean)) {
      return {
        valid: false,
        error: `Invalid Indian RTO plate! Must be e.g. MH12AB1234 or 22BH1234AA (State Code + RTO Code + Series + 4-Digit Number). '${plate}' is not a valid Indian registration plate.`
      };
    }
    return { valid: true, error: null };
  };

  // Real-time Indian 10-Digit Mobile Validator (Telecom Standard starting with 6, 7, 8, or 9)
  const validateMobileNumber = (mobile: string) => {
    const clean = mobile.replace(/\D/g, '');
    if (!clean) {
      return { valid: false, error: 'Policyholder 10-digit mobile number is required.' };
    }
    if (clean.length !== 10) {
      return { valid: false, error: `Must be exactly 10 digits (${clean.length}/10 digits entered).` };
    }
    if (!['6', '7', '8', '9'].includes(clean[0])) {
      return { valid: false, error: 'Must begin with 6, 7, 8, or 9 (Indian telecom standard).' };
    }
    return { valid: true, error: null };
  };

  const plateValidation = validatePlateNumber(regNo);
  const mobileValidation = validateMobileNumber(mobileNumber);

  // Check if entered registration plate already has an active policy
  useEffect(() => {
    const clean = regNo.replace(/[\s-]/g, '').toUpperCase();
    const validStates = '(?:AN|AP|AR|AS|BR|CG|CH|DD|DL|DN|GA|GJ|HR|HP|JH|JK|KA|KL|LA|LD|MP|MH|MN|ML|MZ|NL|OD|PB|PY|RJ|SK|TN|TR|TS|UK|UP|WB)';
    const rtoPattern = new RegExp(`^(${validStates}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2})$`);
    if (!clean || !rtoPattern.test(clean)) {
      setActivePolicyConflict(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCheckingPlate(true);
        const res = await fetch(`/api/vehicles/check-plate?registration_number=${clean}`);
        if (res.ok) {
          const data = await res.json();
          if (data.has_active_policy) {
            setActivePolicyConflict(data);
          } else {
            setActivePolicyConflict(null);
          }
        }
      } catch (e) {
        console.error('Error verifying plate active status:', e);
      } finally {
        setCheckingPlate(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [regNo]);

  // Razorpay Gateway State
  const [razorpayOrder, setRazorpayOrder] = useState<any>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [currentPolicyId, setCurrentPolicyId] = useState('');
  const [currentPolicyData, setCurrentPolicyData] = useState<any>(null);

  // Enforce Login Guard
  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/buy' } });
    } else if (!mobileNumber && user.mobile) {
      setMobileNumber(user.mobile);
    }
  }, [user, navigate]);

  // Fetch dynamic products and vehicle catalog from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/vehicles/catalog')
        ]);

        if (prodRes.ok) {
          const pData: InsuranceProduct[] = await prodRes.json();
          setProducts(pData);

          const paramPlan = searchParams.get('plan') || searchParams.get('product_id');
          const statePlan = (location.state as any)?.plan;
          const targetPlan = paramPlan || statePlan;

          if (targetPlan && pData.length > 0) {
            const matched = pData.find(p =>
              p.id === targetPlan ||
              p.name.toLowerCase().includes(targetPlan.toLowerCase()) ||
              p.plan_type.toLowerCase() === targetPlan.toLowerCase()
            );
            if (matched) {
              setSelectedProductId(matched.id);
            } else {
              setSelectedProductId(pData[0].id);
            }
          } else if (pData.length > 0) {
            setSelectedProductId(pData[0].id);
          }
        }

        if (catRes.ok) {
          const cData: VehicleCatalogItem[] = await catRes.json();
          setVehicleCatalog(cData);
          if (cData.length > 0) {
            const carVehicles = cData.filter(v => v.vehicle_type === 'Car');
            const initialVeh = carVehicles.length > 0 ? carVehicles[0] : cData[0];
            setSelectedCatalogId(String(initialVeh.id));
            setActiveCategory(initialVeh.vehicle_type as any);
            setVehType(initialVeh.vehicle_type);
            setMake(initialVeh.manufacturer);
            setModelName(initialVeh.model + ' (' + initialVeh.variant + ')');
            setFuelType(initialVeh.fuel_type);
            setExShowroom(initialVeh.ex_showroom_price);
          }
        }
      } catch (err) {
        console.error('Failed to load initial data', err);
      } finally {
        setProductsLoading(false);
      }
    };
    fetchData();
  }, [searchParams, location.state]);

  // IRDAI Statutory Depreciation Calculator
  const computeStatutoryValuation = (exPrice: number, mfgYear: number) => {
    const curYear = 2026;
    const age = Math.max(0, curYear - mfgYear);
    let depPct = 5.0;
    if (age === 0) depPct = 5.0;
    else if (age === 1) depPct = 15.0;
    else if (age === 2) depPct = 20.0;
    else if (age === 3) depPct = 30.0;
    else if (age === 4) depPct = 40.0;
    else if (age <= 5) depPct = 50.0;
    else depPct = Math.min(75.0, 50.0 + (age - 5) * 4.0);

    const statutoryIdv = Math.round(exPrice * (1.0 - depPct / 100.0));
    const minAllowable = Math.round(statutoryIdv * 0.85);
    const maxAllowable = Math.round(statutoryIdv * 1.15);
    return { age, depPct, statutoryIdv, minAllowable, maxAllowable };
  };

  const valuation = computeStatutoryValuation(exShowroom, year);

  // Sync declared IDV when exShowroom or year changes (if user hasn't explicitly customized far away)
  useEffect(() => {
    setDeclaredIdv(valuation.statutoryIdv);
  }, [exShowroom, year]);

  // Variance calculation
  const variancePct = valuation.statutoryIdv > 0
    ? Number((((declaredIdv - valuation.statutoryIdv) / valuation.statutoryIdv) * 100).toFixed(1))
    : 0;
  const isFlagged = Math.abs(variancePct) > 15.0;

  const handleCategoryChange = (category: 'Car' | 'Two-Wheeler' | 'Electric Vehicle') => {
    setActiveCategory(category);
    setIsCustomExShowroom(false);
    const catVehicles = vehicleCatalog.filter(v => v.vehicle_type === category);
    if (catVehicles.length > 0) {
      const firstVeh = catVehicles[0];
      setSelectedCatalogId(String(firstVeh.id));
      setVehType(firstVeh.vehicle_type);
      setMake(firstVeh.manufacturer);
      setModelName(firstVeh.model + ' (' + firstVeh.variant + ')');
      setFuelType(firstVeh.fuel_type);
      setExShowroom(firstVeh.ex_showroom_price);
    }
    // Strictly switch to matching insurance product for this category
    const matchingProd = products.find(p => p.vehicle_type === category) || products.find(p => p.vehicle_type === 'All Vehicles');
    if (matchingProd) {
      setSelectedProductId(matchingProd.id);
    }
  };

  const filteredCatalog = vehicleCatalog.filter(v => v.vehicle_type === activeCategory);

  // Eligible products strictly filtered by active vehicle category
  const eligibleProducts = products.filter(
    p => p.vehicle_type === 'All Vehicles' || p.vehicle_type === activeCategory
  );

  // Guard: Ensure selected plan always matches active category
  useEffect(() => {
    if (products.length > 0) {
      const currentSelected = products.find(p => p.id === selectedProductId);
      if (!currentSelected || (currentSelected.vehicle_type !== 'All Vehicles' && currentSelected.vehicle_type !== activeCategory)) {
        const eligible = products.find(p => p.vehicle_type === activeCategory) || products.find(p => p.vehicle_type === 'All Vehicles');
        if (eligible) {
          setSelectedProductId(eligible.id);
        }
      }
    }
  }, [activeCategory, products, selectedProductId]);

  const handleVehicleSelect = (catalogIdStr: string) => {
    setSelectedCatalogId(catalogIdStr);
    setIsCustomExShowroom(false);
    const item = vehicleCatalog.find(c => String(c.id) === catalogIdStr);
    if (item) {
      setVehType(item.vehicle_type);
      setMake(item.manufacturer);
      setModelName(item.model + ' (' + item.variant + ')');
      setFuelType(item.fuel_type);
      setExShowroom(item.ex_showroom_price);
    }
  };

  const selectedProduct = products.find(p => p.id === selectedProductId) || eligibleProducts[0] || products[0];

  // Actuarial Premium Calculation
  const baseRate = selectedProduct ? selectedProduct.base_rate : 0.024;
  const calculatedPremium = Math.round(Number(declaredIdv) * baseRate * duration);

  if (!user) return null;

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(true));
        existing.addEventListener('error', () => resolve(false));
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setRegPlateTouched(true);
    setMobileTouched(true);

    // 1. Indian Vehicle Registration Number Validation
    if (!regNo.trim()) {
      setFormError('Registration Plate Number is required. Please enter your vehicle registration number (e.g. MH12AB1234).');
      return;
    }

    const cleanReg = regNo.replace(/[\s-]/g, '').toUpperCase();
    const plateCheck = validatePlateNumber(cleanReg);
    if (!plateCheck.valid) {
      setFormError(plateCheck.error || 'Please enter a valid Indian vehicle registration number (e.g. MH12AB1234 or 22BH1234AA).');
      return;
    }

    if (activePolicyConflict) {
      setFormError(`Duplicate Active Policy Violation: Vehicle '${cleanReg}' already has an ACTIVE insurance policy (${activePolicyConflict.policy_number}) valid until ${activePolicyConflict.end_date}. Under IRDAI regulations, dual active insurance on the same vehicle is strictly prohibited.`);
      return;
    }

    // 2. Policyholder 10-Digit Mobile Validation
    const cleanMobile = mobileNumber.replace(/\D/g, '');
    const mobileCheck = validateMobileNumber(cleanMobile);
    if (!mobileCheck.valid) {
      setFormError(mobileCheck.error || 'Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    // 3. Original Ex-Showroom Valuation Bounds
    if (exShowroom < 10000 || exShowroom > 20000000) {
      setFormError('Original Ex-Showroom vehicle price must be between ₹10,000 and ₹2,00,00,000.');
      return;
    }

    // 4. Declared Insured Value (IDV) Bounds
    if (declaredIdv < 10000 || declaredIdv > 20000000) {
      setFormError('Declared vehicle value (IDV) must be between ₹10,000 and ₹2,00,00,000.');
      return;
    }

    // 5. Statutory Vehicle Age Limit (15 Years Max as per CMVR / IRDAI)
    const currentYear = new Date().getFullYear();
    if (Number(year) < currentYear - 15 || Number(year) > currentYear) {
      setFormError(`Statutory Vehicle Ineligibility: Under Central Motor Vehicles Rules (CMVR Rule 56/59) and IRDAI regulations, vehicles older than 15 years (${year}) cannot be onboarded for comprehensive insurance. Permissible registration is between ${currentYear - 15} and ${currentYear}.`);
      return;
    }

    // 6. Plan Eligibility Validation
    if (selectedProduct && selectedProduct.vehicle_type !== 'All Vehicles' && selectedProduct.vehicle_type !== vehType) {
      setFormError(`Plan Eligibility Error: '${selectedProduct.name}' is only eligible for ${selectedProduct.vehicle_type} vehicles. Your selected vehicle is a ${vehType}. Please select a valid plan.`);
      return;
    }

    setLoading(true);

    try {
      // 1. Enroll vehicle
      const vRes = await fetch('/api/vehicles?user_id=' + user.userId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_number: cleanReg,
          vehicle_type: vehType,
          manufacturer: make,
          model: modelName,
          manufacturing_year: Number(year),
          fuel_type: fuelType,
          estimated_idv: Number(declaredIdv)
        })
      });
      const vData = await vRes.json();
      if (!vRes.ok) {
        setFormError(vData.detail || 'Failed to register vehicle particulars.');
        setLoading(false);
        return;
      }
      const vehId = vData.vehicle_id;

      // 2. Buy policy
      const planName = selectedProduct ? selectedProduct.name : 'Comprehensive Shield Pro';
      const pRes = await fetch('/api/policies?user_id=' + user.userId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: vehId,
          duration_years: Number(duration),
          plan_type: planName,
          calculated_premium: calculatedPremium,
          prototype_amount_paid: 1.0,
          declared_idv: Number(declaredIdv),
          statutory_idv: Number(valuation.statutoryIdv)
        })
      });

      if (!pRes.ok) {
        const pErr = await pRes.json();
        setFormError(pErr.detail || 'Failed to initialize policy record.');
        setLoading(false);
        return;
      }

      const pData = await pRes.json();
      setCurrentPolicyId(pData.policy_id);
      setCurrentPolicyData(pData);

      // 3. Create Razorpay Order
      const rzpRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_id: pData.policy_id,
          amount_inr: 1.0,
          customer_name: user?.fullName || 'Valued Policyholder',
          customer_email: user?.email || 'customer@securewheels.com',
          customer_phone: cleanMobile
        })
      });

      if (rzpRes.ok) {
        const rzpData = await rzpRes.json();
        setRazorpayOrder(rzpData);

        // Ensure Razorpay SDK script is loaded
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded || !(window as any).Razorpay) {
          setFormError('Razorpay payment gateway script could not be loaded. Please check your internet connection and try again.');
          return;
        }

        // Launch official Razorpay Standard Checkout
        try {
          const options: any = {
            key: rzpData.key_id || 'rzp_test_TixocUpKm9Az6k',
            order_id: rzpData.order_id,
            amount: rzpData.amount || rzpData.amount_paise || 100,
            currency: rzpData.currency || 'INR',
            name: 'SecureWheels General Insurance',
            description: `${planName} (${duration} Year Term)`,
            image: 'https://cdn-icons-png.flaticon.com/512/3209/3209994.png',
            handler: async (response: any) => {
              await completePaymentVerification(
                pData.policy_id,
                response.razorpay_order_id || rzpData.order_id,
                response.razorpay_payment_id,
                response.razorpay_signature,
                pData
              );
            },
            prefill: {
              name: user?.fullName || 'Valued Policyholder',
              email: user?.email || 'customer@securewheels.com',
              contact: cleanMobile
            },
            notes: {
              policy_id: pData.policy_id,
              vehicle_reg: regNo,
              plan_type: planName
            },
            theme: { color: '#1F6FEB' },
            modal: {
              ondismiss: async () => {
                setLoading(false);
                setFormError('Payment was not completed. Policy application was cancelled and not booked.');
                try {
                  await fetch(`/api/policies/${pData.policy_id}/draft`, { method: 'DELETE' });
                } catch (e) {}
              },
              escape: true,
              backdropclose: false
            }
          };

          const rzpInstance = new (window as any).Razorpay(options);
          rzpInstance.on('payment.failed', async (resp: any) => {
            console.warn('Razorpay payment failed:', resp.error);
            setLoading(false);
            setFormError(`Razorpay Payment Failed: ${resp.error?.description || 'Gateway declined.'}`);
            try {
              await fetch(`/api/policies/${pData.policy_id}/draft`, { method: 'DELETE' });
            } catch (e) {}
          });
          rzpInstance.open();
        } catch (rzpErr: any) {
          console.error('Razorpay checkout open error:', rzpErr);
          setFormError('Failed to launch Razorpay checkout: ' + (rzpErr.message || 'Please try again.'));
        }
      } else {
        const pErr = await rzpRes.json();
        setFormError(pErr.detail || 'Failed to initialize payment gateway order with Razorpay.');
      }

    } catch (e: any) {
      setFormError('Network communication error: ' + (e.message || 'Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const completePaymentVerification = async (policyId: string, orderId: string, paymentId: string, signature: string | null, policyData: any) => {
    setPaymentProcessing(true);
    setFormError(null);
    try {
      const vRes = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_id: policyId,
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature || 'rzp_sig_verified'
        })
      });

      if (vRes.ok) {
        setSuccessData({
          ...policyData,
          status: 'ACTIVE'
        });
      } else {
        const err = await vRes.json();
        setFormError(err.detail || 'Payment verification could not be recorded.');
      }
    } catch (e: any) {
      setFormError('Network communication error during payment verification: ' + e.message);
    } finally {
      setPaymentProcessing(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }}>
      <div style={{ backgroundColor: '#fff', padding: '36px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        
        {successData ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            {successData.status === 'PENDING_ADMIN_APPROVAL' ? (
              <>
                <AlertTriangle size={56} color='#D97706' style={{ margin: '0 auto 16px' }} />
                <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#B45309', marginBottom: '8px' }}>
                  Policy Submitted for Underwriting Review
                </h2>
                <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '8px', padding: '14px 20px', maxWidth: '580px', margin: '0 auto 20px', textAlign: 'left', fontSize: '13px', color: '#92400E', lineHeight: '1.5' }}>
                  <strong>Valuation Notice:</strong> Your declared IDV (₹{Number(declaredIdv).toLocaleString()}) deviates by <strong>{variancePct > 0 ? `+${variancePct}` : variancePct}%</strong> from the statutory IRDAI depreciation schedule (₹{Number(valuation.statutoryIdv).toLocaleString()}).
                  <br />
                  Our Chief Underwriter will review and verify your valuation within 2 hours. Your policy will then be activated automatically.
                </div>
              </>
            ) : (
              <>
                <CheckCircle2 size={56} color='#15803D' style={{ margin: '0 auto 16px' }} />
                <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#12304A', marginBottom: '8px' }}>
                  Policy Issued & Activated Successfully!
                </h2>
                <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '20px' }}>
                  Official IRDAI 3-Page Policy Schedule generated for <strong>{user?.fullName || 'Valued Policyholder'}</strong>.
                </p>
              </>
            )}

            {/* Schedule Highlights Box */}
            <div style={{ backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'left', maxWidth: '540px', margin: '0 auto 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#64748B' }}>Policy Number:</span>
                <strong style={{ color: '#1E293B', fontFamily: 'monospace' }}>{successData.policy_number}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#64748B' }}>Policy Status:</span>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '700',
                  backgroundColor: successData.status === 'ACTIVE' ? '#DCFCE7' : '#FEF3C7',
                  color: successData.status === 'ACTIVE' ? '#15803D' : '#B45309'
                }}>
                  {successData.status === 'ACTIVE' ? 'ACTIVE / FULLY COVERED' : 'PENDING UNDERWRITING APPROVAL'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#64748B' }}>Vehicle & Insured Declared Value:</span>
                <strong style={{ color: '#1E293B' }}>{make} {modelName} • ₹{Number(declaredIdv).toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#64748B' }}>Coverage Period:</span>
                <span>{successData.start_date} to {successData.end_date}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#64748B' }}>Annual Actuarial Premium:</span>
                <span>₹{Number(successData.calculated_premium).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '700', color: '#15803D', borderTop: '1px solid #E2E8F0', paddingTop: '8px' }}>
                <span>Amount Paid via Razorpay:</span>
                <span>₹1.00 (Success)</span>
              </div>
            </div>

            {/* Regulatory PDF Notice */}
            <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '12px 18px', maxWidth: '540px', margin: '0 auto 28px', textAlign: 'left', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <FileText size={24} color='#1F6FEB' style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '12px', color: '#1E40AF' }}>
                <strong>3-Page IRDAI Policy Schedule Generated:</strong> Contains Certificate of Insurance, Premium Computation, Policy Exclusions & Terms, and Ombudsman Redressal matrix.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <a 
                href={'/api/policies/' + successData.policy_id + '/pdf'} 
                target='_blank' 
                rel='noreferrer'
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#1F6FEB', color: '#fff', borderRadius: '6px', fontWeight: '700', textDecoration: 'none', fontSize: '14px' }}>
                <Download size={18} /> Download 3-Page Policy PDF
              </a>
              <Link 
                to='/claims' 
                style={{ padding: '12px 24px', backgroundColor: '#0284C7', color: '#fff', borderRadius: '6px', fontWeight: '700', textDecoration: 'none', fontSize: '14px' }}>
                File Digital Claim
              </Link>
              <Link 
                to='/dashboard' 
                style={{ padding: '12px 24px', backgroundColor: '#E2E8F0', color: '#334155', borderRadius: '6px', fontWeight: '700', textDecoration: 'none', fontSize: '14px' }}>
                Go to My Garage
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '24px', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#12304A' }}>Purchase Motor Vehicle Coverage</h1>
                <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                  Policyholder: <strong>{user?.fullName || 'Valued Policyholder'}</strong> ({user?.email || 'Registered Policyholder'}) • Instant IRDAI Statutory Underwriting
                </p>
              </div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#15803D', backgroundColor: '#DCFCE7', padding: '4px 10px', borderRadius: '12px' }}>
                IRDAI Catalog Active
              </span>
            </div>

            {formError && (
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #F87171', color: '#B91C1C', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{formError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormError(null)}
                  style={{
                    backgroundColor: '#DC2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Dismiss / Unlock Screen
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Step 1: Vehicle Particulars & Catalog Selector */}
              <div style={{ marginBottom: '28px', backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <label style={{ fontSize: '15px', fontWeight: '800', color: '#12304A', margin: 0 }}>
                    Step 1: Select Vehicle Category & Model from Master Catalog
                  </label>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#1E40AF', backgroundColor: '#DBEAFE', padding: '3px 10px', borderRadius: '12px' }}>
                    Active Category: {activeCategory}
                  </span>
                </div>

                {/* 3 Dedicated Category Selection Boxes */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                    Select Vehicle Category:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    {[
                      { id: 'Car', label: 'Car / Four-Wheeler', sub: 'Hatchbacks, Sedans, SUVs', icon: Car, color: '#1F6FEB' },
                      { id: 'Two-Wheeler', label: 'Two-Wheeler / Bike', sub: 'Motorcycles & Scooters', icon: Bike, color: '#D97706' },
                      { id: 'Electric Vehicle', label: 'Electric Vehicle (EV)', sub: 'EV Cars & Electric Scooters', icon: Zap, color: '#059669' }
                    ].map((cat) => {
                      const isCatActive = activeCategory === cat.id;
                      const IconComponent = cat.icon;
                      return (
                        <div
                          key={cat.id}
                          onClick={() => handleCategoryChange(cat.id as any)}
                          style={{
                            border: isCatActive ? `2px solid ${cat.color}` : '1px solid #CBD5E1',
                            backgroundColor: isCatActive ? '#F0F9FF' : '#fff',
                            borderRadius: '10px',
                            padding: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            transition: 'all 0.15s ease',
                            boxShadow: isCatActive ? '0 3px 10px rgba(0,0,0,0.06)' : 'none'
                          }}
                        >
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '8px',
                            backgroundColor: isCatActive ? cat.color : '#F1F5F9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isCatActive ? '#fff' : '#64748B',
                            flexShrink: 0
                          }}>
                            <IconComponent size={22} />
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: isCatActive ? cat.color : '#1E293B' }}>
                              {cat.label}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>
                              {cat.sub}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Select {activeCategory} Model ({filteredCatalog.length} Models in Catalog)
                  </label>
                  <select
                    value={selectedCatalogId}
                    onChange={(e) => handleVehicleSelect(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff' }}>
                    {filteredCatalog.map((v) => (
                      <option key={v.id} value={String(v.id)}>
                        {v.manufacturer} {v.model} ({v.variant}) • Ex-Showroom: ₹{v.ex_showroom_price.toLocaleString()} ({v.fuel_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  {/* Field 1: Registration Plate Number with RTO Format Validation & Duplicate Guard */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', margin: 0 }}>
                        Registration Plate Number <span style={{ color: '#DC2626' }}>*</span>
                      </label>
                      {activePolicyConflict ? (
                        <span style={{ fontSize: '10px', color: '#DC2626', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <AlertCircle size={12} /> Already Insured
                        </span>
                      ) : plateValidation.valid && regNo ? (
                        <span style={{ fontSize: '10px', color: '#15803D', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <CheckCircle2 size={12} /> Valid RTO
                        </span>
                      ) : null}
                    </div>
                    <input 
                      type='text' 
                      value={regNo} 
                      onChange={(e) => {
                        setRegNo(e.target.value.toUpperCase());
                        setRegPlateTouched(true);
                      }}
                      onBlur={() => setRegPlateTouched(true)}
                      placeholder='e.g. MH12AB1234 or 22BH1234AA'
                      style={{ 
                        width: '100%', 
                        padding: '10px 12px', 
                        border: (activePolicyConflict || (regPlateTouched && !plateValidation.valid)) ? '2px solid #EF4444' : (plateValidation.valid && regNo ? '2px solid #10B981' : '1px solid #CBD5E1'), 
                        borderRadius: '6px', 
                        fontSize: '13px', 
                        textTransform: 'uppercase', 
                        backgroundColor: (activePolicyConflict || (regPlateTouched && !plateValidation.valid)) ? '#FEF2F2' : '#fff',
                        outline: 'none',
                        transition: 'border-color 0.15s ease'
                      }} 
                      required 
                    />
                    {activePolicyConflict ? (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '8px 10px', borderRadius: '6px', fontSize: '11px', marginTop: '6px', lineHeight: '1.4' }}>
                        <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                        <div>
                          <strong>Active Policy Conflict:</strong> Vehicle <strong>{regNo}</strong> already has an active policy (<strong>{activePolicyConflict.policy_number}</strong>) valid until <strong>{activePolicyConflict.end_date}</strong>. Duplicate active coverage cannot be purchased under IRDAI rules.
                        </div>
                      </div>
                    ) : regPlateTouched && !plateValidation.valid ? (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', color: '#DC2626', fontSize: '11px', marginTop: '5px', lineHeight: '1.3' }}>
                        <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span>{plateValidation.error}</span>
                      </div>
                    ) : plateValidation.valid && regNo ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#15803D', fontSize: '11px', marginTop: '4px' }}>
                        <CheckCircle2 size={12} />
                        <span>Recognized Indian RTO vehicle plate format.</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                        Format: State Code + RTO + Series + 4 Digits (e.g. MH12AB1234).
                      </div>
                    )}
                  </div>

                  {/* Field 2: Manufacturing Year */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      Manufacturing Year <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <select
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff', outline: 'none' }}>
                      {Array.from({ length: 16 }, (_, i) => 2026 - i).map((y) => (
                        <option key={y} value={y}>{y} ({2026 - y === 0 ? 'Brand New' : `${2026 - y} Years Old`})</option>
                      ))}
                    </select>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                      Vehicle Age: {2026 - year === 0 ? 'Brand New (< 6 mos)' : `${2026 - year} Year(s)`} • Maximum 15 years as per IRDAI / Central Motor Vehicles Rules (CMVR).
                    </div>
                  </div>

                  {/* Field 3: Policyholder 10-Digit Mobile with Real-time Validation */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', margin: 0 }}>
                        Policyholder Mobile <span style={{ color: '#DC2626' }}>*</span>
                      </label>
                      {mobileValidation.valid && (
                        <span style={{ fontSize: '10px', color: '#15803D', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <CheckCircle2 size={12} /> Valid
                        </span>
                      )}
                    </div>
                    <input 
                      type='text' 
                      value={mobileNumber} 
                      onChange={(e) => {
                        setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10));
                        setMobileTouched(true);
                      }}
                      onBlur={() => setMobileTouched(true)}
                      placeholder='e.g. 9823400123'
                      maxLength={10}
                      style={{ 
                        width: '100%', 
                        padding: '10px 12px', 
                        border: mobileTouched && !mobileValidation.valid ? '2px solid #EF4444' : (mobileValidation.valid && mobileNumber.length === 10 ? '2px solid #10B981' : '1px solid #CBD5E1'), 
                        borderRadius: '6px', 
                        fontSize: '13px', 
                        backgroundColor: mobileTouched && !mobileValidation.valid ? '#FEF2F2' : '#fff',
                        outline: 'none',
                        transition: 'border-color 0.15s ease'
                      }} 
                      required 
                    />
                    {mobileTouched && !mobileValidation.valid ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontSize: '11px', marginTop: '5px' }}>
                        <AlertCircle size={14} style={{ flexShrink: 0 }} />
                        <span>{mobileValidation.error}</span>
                      </div>
                    ) : mobileValidation.valid && mobileNumber.length === 10 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#15803D', fontSize: '11px', marginTop: '4px' }}>
                        <CheckCircle2 size={12} />
                        <span>Valid 10-digit Indian telecom number.</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                        Must be 10 digits starting with 6, 7, 8, or 9.
                      </div>
                    )}
                  </div>

                  {/* Field 4: Original Ex-Showroom Price (Fixed to Catalog by Default, Editable on Demand) */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', margin: 0 }}>
                        Original Ex-Showroom Price (₹)
                      </label>
                      <span style={{ 
                        fontSize: '10px', 
                        fontWeight: '700', 
                        color: isCustomExShowroom ? '#0369A1' : '#15803D', 
                        backgroundColor: isCustomExShowroom ? '#E0F2FE' : '#DCFCE7', 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}>
                        {isCustomExShowroom ? <Unlock size={10} /> : <Lock size={10} />}
                        {isCustomExShowroom ? 'Custom Invoice' : 'Fixed to Catalog'}
                      </span>
                    </div>

                    {!isCustomExShowroom ? (
                      <div>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          padding: '9px 12px', 
                          border: '1px solid #CBD5E1', 
                          borderRadius: '6px', 
                          backgroundColor: '#F8FAFC' 
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Lock size={14} color="#64748B" />
                            <span style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B' }}>
                              ₹{Number(exShowroom).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsCustomExShowroom(true)}
                            title="Click to enter custom dealer invoice price"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: '#EFF6FF',
                              border: '1px solid #BFDBFE',
                              color: '#1D4ED8',
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            <Edit2 size={11} /> Edit Custom
                          </button>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                          🔒 Official MSRP pegged to {make} {modelName}. (Fixed by default for IRDAI tariff compliance).
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input 
                            type='number' 
                            value={exShowroom} 
                            onChange={(e) => setExShowroom(Number(e.target.value))} 
                            min={10000}
                            max={20000000}
                            style={{ 
                              flex: 1, 
                              padding: '9px 12px', 
                              border: exShowroom < 10000 || exShowroom > 20000000 ? '2px solid #EF4444' : '2px solid #1F6FEB', 
                              borderRadius: '6px', 
                              fontSize: '13px', 
                              backgroundColor: '#fff',
                              outline: 'none'
                            }} 
                            required 
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const item = vehicleCatalog.find(c => String(c.id) === selectedCatalogId);
                              if (item) setExShowroom(item.ex_showroom_price);
                              setIsCustomExShowroom(false);
                            }}
                            title="Reset to official catalog ex-showroom price"
                            style={{
                              padding: '6px 10px',
                              backgroundColor: '#F1F5F9',
                              border: '1px solid #CBD5E1',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '700',
                              color: '#475569',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Reset
                          </button>
                        </div>
                        {exShowroom < 10000 || exShowroom > 20000000 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontSize: '11px', marginTop: '4px' }}>
                            <AlertCircle size={13} />
                            <span>Must be between ₹10,000 and ₹2,00,00,000.</span>
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: '#0369A1', marginTop: '4px' }}>
                            Custom price: <strong>₹{Number(exShowroom).toLocaleString('en-IN')}</strong> • Click Reset to return to catalog.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 2: Eligible Insurance Plans Filtered by Active Category */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <label style={{ fontSize: '15px', fontWeight: '800', color: '#12304A', margin: 0 }}>
                    Step 2: Select Eligible Insurance Plan for {activeCategory}
                  </label>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#15803D', backgroundColor: '#DCFCE7', padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={14} /> {eligibleProducts.length} Plans Eligible for {activeCategory}
                  </span>
                </div>

                {productsLoading ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>Loading eligible plans...</div>
                ) : (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                      {eligibleProducts.map((prod) => {
                        const isSelected = prod.id === selectedProductId;
                        return (
                          <div
                            key={prod.id}
                            onClick={() => setSelectedProductId(prod.id)}
                            style={{
                              border: isSelected ? '2px solid #1F6FEB' : '2px solid #E2E8F0',
                              backgroundColor: isSelected ? '#EFF6FF' : '#fff',
                              borderRadius: '10px',
                              padding: '16px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              position: 'relative',
                              boxShadow: isSelected ? '0 4px 14px rgba(31, 111, 235, 0.12)' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '700', color: isSelected ? '#1F6FEB' : '#0369A1', backgroundColor: isSelected ? '#DBEAFE' : '#E0F2FE', padding: '3px 8px', borderRadius: '4px' }}>
                                {prod.vehicle_type === 'All Vehicles' ? `Universal (${activeCategory})` : prod.vehicle_type}
                              </span>
                              <span style={{ fontSize: '13px', fontWeight: '800', color: '#1E293B' }}>
                                {(prod.base_rate * 100).toFixed(1)}% IDV/yr
                              </span>
                            </div>
                            <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#12304A', marginBottom: '6px' }}>
                              {prod.name}
                            </h4>
                            <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.4', marginBottom: '10px' }}>
                              {prod.description}
                            </p>
                            <div style={{ fontSize: '11px', color: '#475569', borderTop: '1px dashed #CBD5E1', paddingTop: '8px' }}>
                              <strong>Compulsory Deductible:</strong> ₹{prod.deductible}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748B', marginTop: '10px', fontStyle: 'italic' }}>
                      💡 Ineligible plans for other vehicle categories are automatically hidden to ensure strict IRDAI compliance.
                    </p>
                  </div>
                )}
              </div>

              {/* Step 3: IRDAI Statutory Valuation Engine & IDV Input */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1E293B', marginBottom: '12px' }}>
                  Step 3: IRDAI Statutory Valuation & Declared Value (IDV)
                </label>

                {/* IRDAI Statutory Benchmark Card */}
                <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#166534' }}>
                      IRDAI Statutory Depreciation Scale (Age: {valuation.age} Years)
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#15803D', backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: '4px' }}>
                      {valuation.depPct}% Depreciation Applied
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '12px', color: '#334155' }}>
                    <div>
                      <span style={{ color: '#64748B', display: 'block' }}>IRDAI Benchmark IDV:</span>
                      <strong style={{ fontSize: '14px', color: '#1E293B' }}>₹{valuation.statutoryIdv.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block' }}>Permitted Corridor (-15%):</span>
                      <strong style={{ fontSize: '14px', color: '#1E293B' }}>₹{valuation.minAllowable.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block' }}>Permitted Corridor (+15%):</span>
                      <strong style={{ fontSize: '14px', color: '#1E293B' }}>₹{valuation.maxAllowable.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                      Your Declared Vehicle Value (IDV in ₹)
                    </label>
                    <input 
                      type='number' 
                      value={declaredIdv} 
                      onChange={(e) => setDeclaredIdv(Number(e.target.value))} 
                      min={10000}
                      max={20000000}
                      style={{ width: '100%', padding: '10px 12px', border: isFlagged ? '2px solid #F59E0B' : '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px', fontWeight: '700' }} 
                      required 
                    />
                    <div style={{ marginTop: '6px' }}>
                      {!isFlagged ? (
                        <span style={{ fontSize: '11px', color: '#15803D', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Check size={13} /> Compliant within IRDAI ±15% corridor ({variancePct > 0 ? `+${variancePct}` : variancePct}%) • Instant Activation
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#B45309', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={13} /> Flagged: {variancePct > 0 ? `+${variancePct}` : variancePct}% deviation • Will route to Chief Underwriter
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Policy Coverage Term</label>
                    <select 
                      value={duration} 
                      onChange={(e) => setDuration(Number(e.target.value))} 
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px' }}>
                      <option value={1}>1 Year Annual Comprehensive Term</option>
                      <option value={3}>3 Years Multi-Year Shield (IRDAI Long-Term Package)</option>
                    </select>
                  </div>
                </div>

                {/* Razorpay Gateway Information Banner */}
                <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', padding: '14px 18px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <CreditCard size={24} color='#1F6FEB' style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: '12px', color: '#1E40AF', lineHeight: '1.5' }}>
                    <strong>Razorpay Secured Payment Gateway Integrated:</strong> Academic demonstration fee is nominal ₹1.00. Realtime Razorpay Order ID is generated on checkout. Live payments will activate automatically when you provide <code>RAZORPAY_KEY_ID</code> in <code>.env</code>.
                  </div>
                </div>

                {/* Actuarial Calculation Card */}
                <div style={{ backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>
                    <span>Selected Plan: <strong>{selectedProduct?.name}</strong></span>
                    <span>Tariff Rate: {(baseRate * 100).toFixed(1)}% / yr</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#1E293B', marginBottom: '8px' }}>
                    <span>Actuarial Calculated Gross Premium ({duration} Year{duration > 1 ? 's' : ''}):</span>
                    <strong style={{ fontSize: '16px' }}>₹{calculatedPremium.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '800', color: '#15803D', borderTop: '1px solid #E2E8F0', paddingTop: '10px' }}>
                    <span>Razorpay Token Payment:</span>
                    <span>₹1.00 (UPI / NetBanking)</span>
                  </div>
                </div>

                <button 
                  type='submit' 
                  disabled={loading}
                  style={{ 
                    width: '100%', 
                    padding: '14px', 
                    backgroundColor: isFlagged ? '#D97706' : '#1F6FEB', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: '6px', 
                    fontWeight: '800', 
                    fontSize: '15px', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px' 
                  }}>
                  <Lock size={18} /> {loading ? 'Processing IRDAI Underwriting & Schedule...' : isFlagged ? `Submit for Underwriter Approval (₹1.00 Token)` : `Pay ₹1.00 & Activate Official ${duration}-Year Policy`}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

    </div>
  );
};
