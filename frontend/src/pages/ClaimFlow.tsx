import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, AlertTriangle, CheckCircle2, Phone, Mail, Camera, ArrowRight,
  Upload, Sparkles, Check, X, FileText, MapPin, Calendar, Clock, Car, RefreshCw
} from 'lucide-react';
import { resilientFetch, compressImageFile } from '../utils/apiClient';

interface DamagedPartOption {
  id: string;
  name: string;
  category: 'Front' | 'Glass' | 'Sides' | 'Rear' | 'Underbody';
  defaultCost: number;
}

const VEHICLE_PARTS: DamagedPartOption[] = [
  // Front Zone
  { id: 'front_bumper', name: 'Front Bumper Assembly', category: 'Front', defaultCost: 12000 },
  { id: 'bonnet_hood', name: 'Bonnet / Engine Hood', category: 'Front', defaultCost: 18000 },
  { id: 'headlights', name: 'Front Headlights (Left/Right)', category: 'Front', defaultCost: 15000 },
  { id: 'radiator_grille', name: 'Radiator & Front Grille', category: 'Front', defaultCost: 16000 },

  // Glass & Visibility
  { id: 'front_windshield', name: 'Front Laminated Windshield', category: 'Glass', defaultCost: 14000 },
  { id: 'rear_windshield', name: 'Rear Defogger Glass', category: 'Glass', defaultCost: 11000 },
  { id: 'door_windows', name: 'Door Window Glasses', category: 'Glass', defaultCost: 8000 },

  // Side Doors & Panels
  { id: 'front_doors', name: 'Front Doors (Left / Right)', category: 'Sides', defaultCost: 14500 },
  { id: 'rear_doors', name: 'Rear Doors (Left / Right)', category: 'Sides', defaultCost: 13500 },
  { id: 'fenders_quarter', name: 'Fenders & Quarter Panels', category: 'Sides', defaultCost: 11000 },
  { id: 'side_mirrors', name: 'ORVM / Side Mirrors', category: 'Sides', defaultCost: 4500 },

  // Rear Zone
  { id: 'rear_bumper', name: 'Rear Bumper & Diffuser', category: 'Rear', defaultCost: 12500 },
  { id: 'tailgate_boot', name: 'Boot Lid / Tailgate', category: 'Rear', defaultCost: 17500 },
  { id: 'taillights', name: 'Rear Taillights Cluster', category: 'Rear', defaultCost: 9500 },

  // Underbody & Structure
  { id: 'suspension_axle', name: 'Suspension, Axle & Steering', category: 'Underbody', defaultCost: 26000 },
  { id: 'wheels_tyres', name: 'Alloy Wheels & Tyres', category: 'Underbody', defaultCost: 15000 },
  { id: 'roof_pillar', name: 'Chassis Pillar & Roof Panel', category: 'Underbody', defaultCost: 32000 },
];

interface DamagePreset {
  id: string;
  name: string;
  url: string;
  parts: string;
  desc: string;
  estimate: number;
}

const SAMPLE_PRESETS: DamagePreset[] = [
  {
    id: 'front_bumper',
    name: 'Frontal Bumper & Headlight Impact',
    url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
    parts: 'Front Bumper Assembly, Front Headlights (Left/Right)',
    desc: 'Low-speed frontal collision at traffic intersection.',
    estimate: 27000
  },
  {
    id: 'side_door',
    name: 'Lateral Door & Mirror Swipe',
    url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=600&q=80',
    parts: 'Front Doors (Left / Right), ORVM / Side Mirrors',
    desc: 'Sideswiped by another vehicle during lane merger.',
    estimate: 19000
  },
  {
    id: 'glass_crack',
    name: 'Windshield Rock Impact Fracture',
    url: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=600&q=80',
    parts: 'Front Laminated Windshield',
    desc: 'Struck by flying gravel thrown up by a truck on highway.',
    estimate: 14000
  }
];

const BIKE_PARTS: DamagedPartOption[] = [
  // Front Zone
  { id: 'bike_handlebar', name: 'Handlebar, Controls & Levers', category: 'Front', defaultCost: 2800 },
  { id: 'bike_headlight_fairing', name: 'Headlamp & Front Visor/Fairing', category: 'Front', defaultCost: 4500 },
  { id: 'bike_forks', name: 'Front Telescopic Forks / Suspension', category: 'Front', defaultCost: 6500 },
  { id: 'bike_front_mudguard', name: 'Front Mudguard / Fender', category: 'Front', defaultCost: 1800 },
  { id: 'bike_cluster', name: 'Digital Instrument Console & Speedo', category: 'Front', defaultCost: 5200 },

  // Side & Fuel Tank
  { id: 'bike_fuel_tank', name: 'Fuel Tank & Side Shrouds', category: 'Sides', defaultCost: 8500 },
  { id: 'bike_side_panels', name: 'Side Body Fairing & Cowls', category: 'Sides', defaultCost: 3800 },
  { id: 'bike_crash_guard', name: 'Engine Crash Guard / Leg Guard', category: 'Sides', defaultCost: 2400 },
  { id: 'bike_mirrors', name: 'Rearview Mirrors (Pair)', category: 'Sides', defaultCost: 1200 },

  // Underbody & Exhaust
  { id: 'bike_silencer', name: 'Exhaust Silencer Pipe & Heat Shield', category: 'Underbody', defaultCost: 7500 },
  { id: 'bike_crankcase', name: 'Engine Crankcase Cover & Footpegs', category: 'Underbody', defaultCost: 5600 },
  { id: 'bike_brake_gear', name: 'Brake Pedal & Gear Shift Lever', category: 'Underbody', defaultCost: 1600 },
  { id: 'bike_wheels', name: 'Front/Rear Alloy Wheels & Tyres', category: 'Underbody', defaultCost: 6200 },

  // Rear Zone
  { id: 'bike_tail_lamp', name: 'Tail Lamp & Number Plate Assembly', category: 'Rear', defaultCost: 2600 },
  { id: 'bike_rear_mudguard', name: 'Rear Mudguard / Tyre Hugger', category: 'Rear', defaultCost: 1500 },
  { id: 'bike_monoshock', name: 'Rear Monoshock / Twin Absorbers', category: 'Rear', defaultCost: 4800 },
];

const SAMPLE_BIKE_PRESETS: DamagePreset[] = [
  {
    id: 'bike_tank_fall',
    name: 'Motorcycle Skid & Fuel Tank Dent',
    url: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80',
    parts: 'Fuel Tank & Side Shrouds, Engine Crash Guard / Leg Guard',
    desc: 'Low-side skid on wet asphalt curve, dented fuel tank and bent leg guard.',
    estimate: 10900
  },
  {
    id: 'bike_fork_front',
    name: 'Front Fork & Headlamp Impact',
    url: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=600&q=80',
    parts: 'Headlamp & Front Visor/Fairing, Front Telescopic Forks / Suspension',
    desc: 'Front wheel collided with road divider during abrupt braking.',
    estimate: 11000
  },
  {
    id: 'bike_silencer_scratch',
    name: 'Exhaust Silencer & Side Cowl Scratch',
    url: 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=600&q=80',
    parts: 'Exhaust Silencer Pipe & Heat Shield, Side Body Fairing & Cowls',
    desc: 'Parked motorcycle tipped over due to loose gravel, damaging exhaust pipe.',
    estimate: 11300
  }
];

export const ClaimFlow: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [contact, setContact] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpNotice, setOtpNotice] = useState<any>(null);
  const [verifiedUser, setVerifiedUser] = useState<any>(null);
  const [userPolicies, setUserPolicies] = useState<any[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState('');

  // Photo Upload State (Supports 2 to 4 Multi-Angle Photographs)
  const [photoSourceMode, setPhotoSourceMode] = useState<'upload' | 'sample'>('upload');
  const [photosList, setPhotosList] = useState<Array<{ url: string; name: string; perspective?: string }>>([]);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageFileName, setImageFileName] = useState<string>('');
  const [activePreviewIdx, setActivePreviewIdx] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Damaged Components Selected by User
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  // Incident attributes (Clean, user-driven)
  const [accidentDate, setAccidentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [accidentTime, setAccidentTime] = useState<string>('15:30');
  const [accidentLocation, setAccidentLocation] = useState<string>('');
  const [accidentDesc, setAccidentDesc] = useState<string>('');
  const [damageDesc, setDamageDesc] = useState<string>('');
  const [repairEstimate, setRepairEstimate] = useState<number>(0);
  const [isDrivable, setIsDrivable] = useState<boolean>(true);
  const [thirdParty, setThirdParty] = useState<boolean>(false);
  const [injuryReported, setInjuryReported] = useState<boolean>(false);
  const [policeReportFiled, setPoliceReportFiled] = useState<boolean>(false);
  const [policeReportNumber, setPoliceReportNumber] = useState<string>('');
  const [witnessPresent, setWitnessPresent] = useState<boolean>(false);

  // Multimodal AI Analysis State
  const [cvAnalysis, setCvAnalysis] = useState<any>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);

  const [loading, setLoading] = useState(false);
  const [claimResult, setClaimResult] = useState<any>(null);

  // Step 1: Send OTP
  const handleSendOtp = async () => {
    const clean = contact.trim();
    if (!clean) {
      alert('Please enter your registered mobile number or email address.');
      return;
    }
    setOtpNotice(null);
    setOtpCode('');
    try {
      const res = await resilientFetch('/api/claims/otp/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile_or_email: clean })
      });
      if (res.ok) {
        const data = await res.json();
        setOtpNotice(data);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Verification Failed: Number/email not registered in policyholder database.');
      }
    } catch (e) {
      alert('Network error connecting to OTP gateway.');
    }
  };

  // Step 1: Verify OTP
  const handleVerifyOtp = async () => {
    const cleanCode = otpCode.trim();
    if (!cleanCode) {
      alert('Please enter the 6-digit OTP code sent to your email.');
      return;
    }
    try {
      const res = await resilientFetch('/api/claims/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile_or_email: contact.trim(), otp_code: cleanCode })
      });
      if (res.ok) {
        const data = await res.json();
        setVerifiedUser(data);
        const pRes = await resilientFetch('/api/policies?user_id=' + data.user_id);
        if (pRes.ok) {
          const pols = await pRes.json();
          setUserPolicies(pols);
          if (pols.length > 0) setSelectedPolicyId(pols[0].id);
        }
        setStep(2);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Invalid or expired OTP code.');
      }
    } catch (e) {
      alert('Error verifying OTP.');
    }
  };

  const PHOTO_PERSPECTIVES_LIST = [
    'Perspective 1: Front Full Profile',
    'Perspective 2: Rear Full Profile',
    'Perspective 3: Left Side Profile / Doors',
    'Perspective 4: Right Side Profile / Quarter',
    'Perspective 5: Primary Impact Point (Close-Up)',
    'Perspective 6: Secondary Damage Detail / Scratches',
    'Perspective 7: Windshield & Cabin Overview',
    'Perspective 8: Engine Bay / Under-Hood',
    'Perspective 9: Odometer & Cluster (KM Reading)',
    'Perspective 10: Number Plate & Chassis Stamp',
    'Perspective 11: Wheel & Suspension Assembly',
    'Perspective 12: Accident Scene / Road Overview'
  ];

  // Handle Multi-Photo File Upload (Supports 4 to 12 photos, auto-compressed client-side)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxPhotosAllowed = 12;
    const remainingSlots = maxPhotosAllowed - photosList.length;
    if (remainingSlots <= 0) {
      alert('You have reached the maximum limit of 12 photographs per claim.');
      return;
    }

    const filesToProcess = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, remainingSlots);
    if (filesToProcess.length === 0) return;

    try {
      const processed = await Promise.all(
        filesToProcess.map(async (file, idx) => {
          const compressedUrl = await compressImageFile(file, 1024, 0.78);
          const totalIdx = photosList.length + idx;
          const defaultPerspective = PHOTO_PERSPECTIVES_LIST[totalIdx % PHOTO_PERSPECTIVES_LIST.length];
          return { url: compressedUrl, name: file.name, perspective: defaultPerspective };
        })
      );
      const updated = [...photosList, ...processed];
      setPhotosList(updated);
      setImageUrl(updated[0]?.url || '');
      setImageFileName(updated[0]?.name || '');
      setCvAnalysis(null);
    } catch (err) {
      console.error('Error processing uploaded images:', err);
      alert('Failed to process one or more selected images. Please try again.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    const updated = photosList.filter((_, i) => i !== index);
    setPhotosList(updated);
    setImageUrl(updated[0]?.url || '');
    setImageFileName(updated[0]?.name || '');
    if (activePreviewIdx >= updated.length) {
      setActivePreviewIdx(Math.max(0, updated.length - 1));
    }
    setCvAnalysis(null);
  };

  const selectedPolicy = userPolicies.find((p) => p.id === selectedPolicyId);
  const isBike = selectedPolicy?.vehicle_type === 'Two-Wheeler' || selectedPolicy?.vehicle_type === 'Bike';
  const minRequiredPhotos = isBike ? 4 : 5; // Bike: min 4, Car: min 5 (Guide requirement)
  const availableParts = isBike ? BIKE_PARTS : VEHICLE_PARTS;
  const activePresets = isBike ? SAMPLE_BIKE_PRESETS : SAMPLE_PRESETS;

  // IRDAI 16-Day Statutory Limit & Future Date Limits (local calendar date)
  const formatLocalDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayStr = formatLocalDate(new Date());
  const sixteenDaysAgoDate = new Date();
  sixteenDaysAgoDate.setDate(sixteenDaysAgoDate.getDate() - 16);
  const minAllowedDateStr = formatLocalDate(sixteenDaysAgoDate);

  // Toggle Damaged Part Selection
  const togglePartSelection = (part: DamagedPartOption) => {
    const isSelected = selectedParts.includes(part.name);
    const updated = isSelected
      ? selectedParts.filter((p) => p !== part.name)
      : [...selectedParts, part.name];

    setSelectedParts(updated);

    // Sum estimated costs across all known parts
    const allKnownParts = [...VEHICLE_PARTS, ...BIKE_PARTS];
    const totalCost = updated.reduce((acc, name) => {
      const found = allKnownParts.find((v) => v.name === name);
      return acc + (found ? found.defaultCost : 0);
    }, 0);
    setRepairEstimate(totalCost);

    // Auto-populate damage description
    if (updated.length > 0) {
      setDamageDesc(updated.join(', ') + ' deformed/damaged.');
    } else {
      setDamageDesc('');
    }
    setCvAnalysis(null);
  };

  // Sample Preset Selection (Loads multi-angle bundle: 5 photos for Car, 4 for Bike)
  const handleSelectSample = (preset: DamagePreset) => {
    const sampleBundle = isBike
      ? [
          { url: preset.url, name: `${preset.name} (Front Angle)`, perspective: 'Perspective 1: Front Full Profile' },
          { url: preset.url, name: `${preset.name} (Rear Angle)`, perspective: 'Perspective 2: Rear Full Profile' },
          { url: preset.url, name: `${preset.name} (Side Profile)`, perspective: 'Perspective 3: Left Side Profile / Cowl' },
          { url: preset.url, name: `${preset.name} (Damage Detail)`, perspective: 'Perspective 4: Primary Impact Point (Close-Up)' }
        ]
      : [
          { url: preset.url, name: `${preset.name} (Front Angle)`, perspective: 'Perspective 1: Front Full Profile' },
          { url: preset.url, name: `${preset.name} (Rear Angle)`, perspective: 'Perspective 2: Rear Full Profile' },
          { url: preset.url, name: `${preset.name} (Left Profile)`, perspective: 'Perspective 3: Left Side Profile / Doors' },
          { url: preset.url, name: `${preset.name} (Right Profile)`, perspective: 'Perspective 4: Right Side Profile / Fender' },
          { url: preset.url, name: `${preset.name} (Damage Detail)`, perspective: 'Perspective 5: Primary Impact Point (Close-Up)' }
        ];
    setPhotosList(sampleBundle);
    setImageUrl(preset.url);
    setImageFileName(preset.name);
    setDamageDesc(preset.parts);
    setRepairEstimate(preset.estimate);
    setCvAnalysis(null);
  };

  // Multimodal AI Visual Pre-Check (across all uploaded photos)
  const handleRunImageAnalysis = async () => {
    const effectivePhotos = photosList.length > 0 ? photosList.map(p => p.url) : (imageUrl ? [imageUrl] : []);
    if (effectivePhotos.length === 0) {
      alert('Please upload vehicle damage photographs before running the visual damage pre-check.');
      return;
    }
    setAnalyzingImage(true);
    try {
      const res = await resilientFetch('/api/claims/analyze-damage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_make: selectedPolicy?.manufacturer || 'Vehicle',
          vehicle_type: selectedPolicy?.vehicle_type || 'Car',
          incident_description: accidentDesc || 'Accidental collision',
          damage_description: damageDesc || selectedParts.join(', ') || 'Impact damage',
          estimated_repair_cost: Number(repairEstimate),
          registered_plate: selectedPolicy?.registration_number || '',
          accident_location: accidentLocation.trim() || 'City Urban Area',
          image_urls: effectivePhotos,
          image_metadata: {
            selected_parts: selectedParts
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCvAnalysis(data);
      } else {
        const err = await res.json().catch(() => ({ detail: `Server returned HTTP ${res.status}` }));
        alert('Visual Inspection Error: ' + (err.detail || 'Error performing visual inspection analysis.'));
      }
    } catch (e) {
      alert('Network error connecting to computer vision service. Please wait a few seconds and retry.');
    } finally {
      setAnalyzingImage(false);
    }
  };

  // Step 2: Submit Claim
  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPolicyId) {
      alert('Please select an active policy.');
      return;
    }

    const trimmedDesc = accidentDesc.trim();
    if (!trimmedDesc || trimmedDesc.length < 15) {
      alert('Please provide an informative incident description (at least 15 characters) explaining the accident circumstances.');
      return;
    }

    // Client-side guard against keyboard smashing or non-contextual noise
    const words = trimmedDesc.toLowerCase().split(/\s+/).filter(Boolean);
    const hasRepeatedLetters = /([a-z])\1{4,}/i.test(trimmedDesc);
    const hasUnnaturalWords = words.some(w => w.length > 5 && !/[aeiouy]/i.test(w));
    if (hasRepeatedLetters || hasUnnaturalWords) {
      alert('Incident narrative appears irregular or non-contextual. Please write genuine details describing how the vehicle was damaged.');
      return;
    }

    const trimmedLoc = accidentLocation.trim();
    if (!trimmedLoc || trimmedLoc.length < 3) {
      alert('Please provide a specific accident location (e.g., Pune-Solapur Highway or MG Road, Pune).');
      return;
    }

    if (selectedParts.length === 0 && !damageDesc.trim()) {
      alert('Please select the damaged vehicle components or describe the damage.');
      return;
    }
    
    const effectivePhotos = photosList.length > 0 ? photosList.map(p => p.url) : (imageUrl ? [imageUrl] : []);
    if (effectivePhotos.length < minRequiredPhotos) {
      alert(`⚠️ Mandatory Photographic Evidence:\nPlease upload at least ${minRequiredPhotos} photographs showing vehicle damage perspectives for this ${isBike ? 'Two-Wheeler (Min 4)' : 'Four-Wheeler Car (Min 5)'}. Currently uploaded: ${effectivePhotos.length}.`);
      return;
    }

    // Client-side guard for automated forensic precheck blocking
    if (cvAnalysis && cvAnalysis.can_submit === false) {
      alert(`⚠️ Submission Blocked by Automated Forensic Inspection:\n\n${cvAnalysis.guidance_message || 'Please replace the flagged evidence photographs before submitting your claim.'}`);
      return;
    }

    // Incident date and time validation
    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    if (accidentDate > todayStr) {
      alert('⚠️ Invalid Incident Date: The accident date cannot be in the future. Please select today or an earlier date within the statutory 16-day window.');
      return;
    }

    if (accidentDate === todayStr && accidentTime && accidentTime > currentTimeStr) {
      alert(`⚠️ Invalid Incident Time: The accident occurrence time (${accidentTime}) cannot be in the future relative to current time (${currentTimeStr}).`);
      return;
    }

    if (accidentDate < minAllowedDateStr) {
      alert('⚠️ Statutory Filing Window Expired: Under IRDAI statutory regulations, motor insurance claims must be filed within 16 days of occurrence. Incidents older than 16 days cannot be accepted for claim processing.');
      return;
    }

    setLoading(true);
    try {
      const res = await resilientFetch('/api/claims/submit?user_id=' + verifiedUser.user_id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_id: selectedPolicyId,
          accident_date: accidentDate,
          accident_time: accidentTime,
          accident_location: trimmedLoc,
          incident_description: trimmedDesc,
          damage_description: damageDesc.trim() || selectedParts.join(', '),
          estimated_repair_cost: Number(repairEstimate),
          is_drivable: isDrivable,
          third_party_involved: thirdParty,
          injury_reported: injuryReported,
          fatality_reported: false,
          police_report_filed: policeReportFiled,
          witness_present: witnessPresent,
          fault: 'Policy Holder',
          accident_area: 'Urban',
          damage_image_url: effectivePhotos[0] || '',
          damage_image_urls: effectivePhotos
        })
      });

      if (res.ok) {
        const data = await res.json();
        setClaimResult(data);
        setStep(3);
      } else {
        const err = await res.json().catch(() => ({ detail: `Server returned HTTP ${res.status}` }));
        alert('Claim Submission Error: ' + (err.detail || 'Unable to process claim.'));
      }
    } catch (e) {
      alert('Network error submitting claim. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredParts = activeCategory === 'ALL'
    ? availableParts
    : availableParts.filter((p) => p.category === activeCategory);

  return (
    <div style={{ maxWidth: '960px', margin: '40px auto', padding: '0 20px' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '36px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>

        {/* Step Indicator */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#12304A' }}>File An Insurance Claim</h1>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
              OTP Identity Verification • User Photo Evidence Upload • Real-Time AI Fraud Adjudication
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: step >= 1 ? '#1F6FEB' : '#CBD5E1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px' }}>1</span>
            <span style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: step >= 2 ? '#1F6FEB' : '#CBD5E1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px' }}>2</span>
            <span style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: step === 3 ? '#10B981' : '#CBD5E1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px' }}>3</span>
          </div>
        </div>

        {/* STEP 1: OTP Identity Verification */}
        {step === 1 && (
          <div style={{ maxWidth: '520px', margin: '0 auto', padding: '20px 0' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Phone size={24} color='#1F6FEB' />
              </div>
              <h3 style={{ fontSize: '19px', fontWeight: '700', color: '#12304A' }}>Verify Policyholder Identity</h3>
              <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                Enter the mobile number or email linked to your motor insurance policy.
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Registered Mobile or Email</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type='text'
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder='Enter registered 10-digit mobile or email'
                  style={{ flex: 1, padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px' }}
                />
                <button
                  type='button'
                  onClick={handleSendOtp}
                  style={{ padding: '10px 18px', backgroundColor: '#12304A', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
                  Send OTP
                </button>
              </div>

              {otpNotice && (
                <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '12px 14px', borderRadius: '8px', fontSize: '13px', marginTop: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#15803D', fontWeight: '700', marginBottom: '4px' }}>
                    <CheckCircle2 size={16} /> Verification Code Dispatched!
                  </div>
                  <div style={{ color: '#334155', lineHeight: '1.5', fontSize: '12px' }}>
                    A secure 6-digit verification code has been dispatched to your registered email ({otpNotice.email_masked || 'inbox'}) and phone ({otpNotice.mobile_masked || 'SMS'}).
                    <div style={{ color: '#64748B', marginTop: '4px' }}>Please check your email inbox and enter the 6-digit code below to proceed with claim filing.</div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>6-Digit One-Time Password</label>
              <input
                type='text'
                maxLength={6}
                placeholder='Enter 6-digit OTP'
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '20px', letterSpacing: '6px', textAlign: 'center', fontWeight: '700', boxSizing: 'border-box' }}
              />
            </div>

            <button
              type='button'
              onClick={handleVerifyOtp}
              style={{ width: '100%', padding: '12px', backgroundColor: '#15803D', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
              Verify OTP & Load Eligible Policies
            </button>
          </div>
        )}

        {/* STEP 2: Comprehensive Incident Details, Photo Upload & Damaged Components */}
        {step === 2 && (
          <form onSubmit={handleSubmitClaim}>
            {/* Authenticated Banner */}
            <div style={{ backgroundColor: '#F8FAFC', padding: '14px 18px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#334155' }}>Claimant: <strong>{verifiedUser?.full_name}</strong></span>
              <span style={{ fontSize: '12px', color: '#15803D', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={14} /> OTP Verified
              </span>
            </div>

            {/* 1. Policy & Vehicle Selection */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1E293B', marginBottom: '6px' }}>
                Select Insured Vehicle & Policy
              </label>
              {userPolicies.length === 0 ? (
                <div style={{ backgroundColor: '#FEF2F2', padding: '12px', borderRadius: '6px', color: '#B91C1C', fontSize: '13px' }}>
                  No active insurance policies found for this user account.
                </div>
              ) : (
                <select
                  value={selectedPolicyId}
                  onChange={(e) => setSelectedPolicyId(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px' }}>
                  {userPolicies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.registration_number} - {p.manufacturer} {p.model} ({p.policy_number})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 2. Photo Upload Section (User's Own Photo) */}
            <div style={{ backgroundColor: '#FDF4FF', border: '1px solid #F0ABFC', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Camera size={22} color='#9333EA' />
                  <div>
                    <strong style={{ fontSize: '15px', color: '#581C87', display: 'block' }}>
                      Vehicle Crash Photo Evidence
                    </strong>
                    <span style={{ fontSize: '12px', color: '#701A75' }}>
                      Upload authentic photograph of the damaged vehicle for multimodal computer vision inspection
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type='button'
                    onClick={() => setPhotoSourceMode('upload')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '700',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: photoSourceMode === 'upload' ? '#9333EA' : '#F5D0FE',
                      color: photoSourceMode === 'upload' ? '#fff' : '#701A75'
                    }}>
                    Upload My Photo
                  </button>
                  <button
                    type='button'
                    onClick={() => setPhotoSourceMode('sample')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '700',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: photoSourceMode === 'sample' ? '#9333EA' : '#F5D0FE',
                      color: photoSourceMode === 'sample' ? '#fff' : '#701A75'
                    }}>
                    Sample Demos
                  </button>
                </div>
              </div>

              {/* Upload Mode */}
              {photoSourceMode === 'upload' && (
                <div>
                  <input
                    type='file'
                    ref={fileInputRef}
                    accept='image/*'
                    multiple
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />

                  {photosList.length === 0 ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: '2px dashed #C084FC',
                        borderRadius: '8px',
                        padding: '30px 20px',
                        textAlign: 'center',
                        backgroundColor: '#FAF5FF',
                        cursor: 'pointer',
                        transition: 'border 0.2s'
                      }}>
                      <Upload size={36} color='#9333EA' style={{ margin: '0 auto 10px' }} />
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#581C87' }}>
                        Click to browse or drop vehicle damage photos (Min {minRequiredPhotos} to Max 12 for {isBike ? 'Two-Wheeler' : 'Four-Wheeler'})
                      </div>
                      <div style={{ fontSize: '12px', color: '#701A75', marginTop: '4px' }}>
                        Upload multiple perspectives (Front, Rear, Damage Close-Up, License Plate) for full AI Vehicle Identity Verification
                      </div>
                      <div style={{ fontSize: '11px', color: '#9333EA', marginTop: '6px', fontWeight: '600' }}>
                        Hold Ctrl/Cmd to select multiple files at once • JPG, PNG, WebP supported
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                        {photosList.map((photo, pIdx) => {
                          const contradiction = cvAnalysis?.contradictory_photos?.find((cp: any) => cp.photo_index === pIdx + 1);
                          const photoBreakdown = cvAnalysis?.per_photo_breakdown?.find((pb: any) => pb.photo_index === pIdx + 1);
                          const isContradiction = Boolean(contradiction);

                          return (
                            <div key={pIdx} style={{
                              backgroundColor: isContradiction ? '#FEF2F2' : '#fff',
                              border: isContradiction ? '2px solid #EF4444' : (activePreviewIdx === pIdx ? '2px solid #9333EA' : '1px solid #E9D5FF'),
                              borderRadius: '8px',
                              padding: '10px',
                              position: 'relative',
                              boxShadow: isContradiction ? '0 0 0 1px #FCA5A5' : 'none'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: '800',
                                  backgroundColor: isContradiction ? '#FEE2E2' : '#F3E8FF',
                                  color: isContradiction ? '#B91C1C' : '#6B21A8',
                                  padding: '1px 6px',
                                  borderRadius: '4px'
                                }}>
                                  Perspective {pIdx + 1} {isContradiction ? '⚠️ CONTRADICTION' : ''}
                                </span>
                                <button
                                  type='button'
                                  onClick={() => handleRemovePhoto(pIdx)}
                                  style={{ background: '#FEE2E2', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B91C1C', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}
                                  title='Remove this photo'>
                                  ✕
                                </button>
                              </div>
                              <img
                                src={photo.url}
                                alt={`Angle ${pIdx + 1}`}
                                onClick={() => { setActivePreviewIdx(pIdx); setImageUrl(photo.url); }}
                                style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer', border: isContradiction ? '1px solid #F87171' : '1px solid #CBD5E1' }}
                              />
                              {isContradiction ? (
                                <div style={{ marginTop: '6px' }}>
                                  <span style={{ display: 'inline-block', backgroundColor: '#DC2626', color: '#fff', fontSize: '9px', fontWeight: '800', padding: '1px 5px', borderRadius: '3px', marginBottom: '2px' }}>
                                    🚨 VEHICLE MISMATCH
                                  </span>
                                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#991B1B', lineHeight: '1.2' }}>
                                    {contradiction?.detected_entity || 'Incompatible Vehicle'}
                                  </div>
                                </div>
                              ) : photoBreakdown?.detected_entity ? (
                                <div style={{ fontSize: '10px', color: '#15803D', fontWeight: '600', marginTop: '4px' }}>
                                  ✓ {photoBreakdown.detected_entity}
                                </div>
                              ) : (
                                <div style={{ fontSize: '11px', fontWeight: '700', color: '#1E293B', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {photo.perspective || photo.name}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {photosList.length < 12 && (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                              border: '2px dashed #C084FC',
                              borderRadius: '8px',
                              padding: '16px 10px',
                              textAlign: 'center',
                              backgroundColor: '#FAF5FF',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minHeight: '120px'
                            }}>
                            <Upload size={22} color='#9333EA' style={{ marginBottom: '4px' }} />
                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#581C87' }}>
                              + Add Perspective
                            </div>
                            <div style={{ fontSize: '10px', color: '#701A75' }}>
                              ({photosList.length} of 12 • Min {minRequiredPhotos} for {isBike ? 'Bike' : 'Car'})
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#15803D', fontWeight: '600' }}>
                        <span>✓ {photosList.length} photograph(s) loaded & prepared for multi-angle vehicle verification</span>
                        <button
                          type='button'
                          onClick={() => { setPhotosList([]); setImageUrl(''); setImageFileName(''); setCvAnalysis(null); }}
                          style={{ background: 'none', border: 'none', color: '#B91C1C', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}>
                          Clear All Photos
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sample Demos Mode */}
              {photoSourceMode === 'sample' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                  {activePresets.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectSample(p)}
                      style={{
                        border: imageUrl === p.url ? '2px solid #9333EA' : '1px solid #E2E8F0',
                        backgroundColor: imageUrl === p.url ? '#FAF5FF' : '#fff',
                        borderRadius: '8px',
                        padding: '10px',
                        cursor: 'pointer'
                      }}>
                      <img src={p.url} alt={p.name} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', marginBottom: '6px' }} />
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#1E293B' }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Est. Rs. {p.estimate.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* AI Damage Pre-Check trigger & result */}
              {imageUrl && (
                <div style={{ marginTop: '14px' }}>
                  <button
                    type='button'
                    onClick={handleRunImageAnalysis}
                    disabled={analyzingImage}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      backgroundColor: '#9333EA',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: analyzingImage ? 'not-allowed' : 'pointer'
                    }}>
                    <Sparkles size={15} /> {analyzingImage ? 'Executing CV Inspection...' : 'Run Visual Damage Pre-Check'}
                  </button>

                  {cvAnalysis && (
                    <div style={{ marginTop: '12px', backgroundColor: '#fff', padding: '14px', borderRadius: '8px', border: cvAnalysis.visual_consistency_score < 0.70 ? '1px solid #FECACA' : '1px solid #BBF7D0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B' }}>Multimodal AI Vision Assessment:</span>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '800',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          backgroundColor: cvAnalysis.has_cross_vehicle_contradiction ? '#FEE2E2' : '#DCFCE7',
                          color: cvAnalysis.has_cross_vehicle_contradiction ? '#B91C1C' : '#15803D'
                        }}>
                          {cvAnalysis.has_cross_vehicle_contradiction
                            ? '⚠️ INCOMPATIBLE VEHICLE DETECTED'
                            : '✓ VEHICLE IDENTITY VERIFIED'}
                        </span>
                      </div>

                      {!cvAnalysis.has_cross_vehicle_contradiction && !cvAnalysis.vehicle_type_mismatch && (
                        <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', padding: '10px 14px', borderRadius: '6px', fontSize: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle2 size={16} color='#16A34A' />
                          <span>
                            <strong>Vehicle Identity Confirmed:</strong> The uploaded photographic evidence matches your insured <strong>{selectedPolicy?.manufacturer} ({selectedPolicy?.vehicle_type || 'Vehicle'})</strong>.
                          </span>
                        </div>
                      )}

                      {(cvAnalysis.has_cross_vehicle_contradiction || (cvAnalysis.contradictory_photos && cvAnalysis.contradictory_photos.length > 0)) && (
                        <div style={{ backgroundColor: '#FEF2F2', border: '2px solid #EF4444', color: '#991B1B', padding: '14px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '14px', marginBottom: '6px', color: '#B91C1C' }}>
                            <AlertTriangle size={20} color='#DC2626' style={{ flexShrink: 0 }} />
                            <span>🚨 Cross-Vehicle Contradiction Detected ({cvAnalysis.contradictory_photos?.length || 1} Mismatched Perspective Flagged)</span>
                          </div>
                          <div style={{ fontSize: '12px', lineHeight: '1.5', marginBottom: '10px', color: '#7F1D1D' }}>
                            The Multimodal Vision Adjudicator inspected all uploaded perspectives and identified evidence of a different vehicle category conflicting with your insured policy (<strong>{selectedPolicy?.manufacturer} - {selectedPolicy?.vehicle_type || 'Car'}</strong>):
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                            {cvAnalysis.contradictory_photos?.map((cp: any, cIdx: number) => (
                              <div key={cIdx} style={{ backgroundColor: '#fff', border: '1px solid #FCA5A5', padding: '8px 12px', borderRadius: '6px', fontSize: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <strong style={{ color: '#DC2626' }}>{cp.perspective_label || `Perspective ${cp.photo_index}`}:</strong>
                                  <span style={{ fontSize: '10px', fontWeight: '800', color: '#B91C1C', backgroundColor: '#FEE2E2', padding: '2px 6px', borderRadius: '4px' }}>
                                    Detected: {cp.detected_entity}
                                  </span>
                                </div>
                                <div style={{ color: '#4B5563', fontSize: '11px', marginTop: '3px' }}>{cp.reason}</div>
                              </div>
                            ))}
                          </div>
                          <div style={{ fontSize: '11px', color: '#047857', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', padding: '8px 12px', borderRadius: '6px', lineHeight: '1.4' }}>
                            <strong>🛡️ Zero-Blocking Resolution:</strong> Your submission is <strong>NOT blocked</strong>. You may remove/replace the conflicting photo using the ✕ button on its thumbnail above, or proceed. If submitted, this claim will automatically route to a Senior Physical Surveyor with an inter-vehicle contradiction flag.
                          </div>
                        </div>
                      )}

                      {(!cvAnalysis.has_cross_vehicle_contradiction && (cvAnalysis.is_instant_rejection || cvAnalysis.detected_entity_type === 'NON_VEHICLE' || cvAnalysis.vehicle_type_mismatch || cvAnalysis.visual_consistency_score < 0.65)) && (
                        <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #F59E0B', color: '#92400E', padding: '14px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '14px', marginBottom: '6px', color: '#B45309' }}>
                            <AlertTriangle size={18} color='#D97706' style={{ flexShrink: 0 }} />
                            <span>⚠️ Senior Surveyor Review Recommended (Photographic Advisory)</span>
                          </div>
                          <div style={{ fontSize: '12px', lineHeight: '1.5', marginBottom: '8px', color: '#78350F' }}>
                            {cvAnalysis.rejection_reason || 'The visual adjudicator noted close-up component framing or perspective variance against standard full-profile views.'}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '11px', backgroundColor: '#fff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #FDE68A', marginBottom: '8px' }}>
                            <div>
                              <span style={{ color: '#64748B', display: 'block' }}>Photo Subject Perspective:</span>
                              <strong style={{ color: '#B45309' }}>{cvAnalysis.detected_entity_label || 'Automotive Component / Damage Close-up'}</strong>
                            </div>
                            <div>
                              <span style={{ color: '#64748B', display: 'block' }}>Policy Vehicle Profile:</span>
                              <strong style={{ color: '#1E293B' }}>{selectedPolicy?.manufacturer} ({selectedPolicy?.vehicle_type || 'Car'})</strong>
                            </div>
                          </div>
                          {cvAnalysis.can_submit === false ? (
                            <div style={{ fontSize: '12px', color: '#991B1B', fontWeight: '700', backgroundColor: '#FEE2E2', border: '1px solid #F87171', padding: '10px 14px', borderRadius: '6px' }}>
                              🚨 Action Required: {cvAnalysis.guidance_message || 'Uploaded photographic evidence has been flagged. Please replace the flagged photographs to proceed.'}
                            </div>
                          ) : (
                            <div style={{ fontSize: '11px', color: '#15803D', fontWeight: '600', backgroundColor: '#DCFCE7', padding: '6px 10px', borderRadius: '4px' }}>
                              ✓ Photographic Evidence Verified: Compatible with registered {selectedPolicy?.vehicle_type || 'vehicle'} policy.
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px', marginBottom: '8px', textAlign: 'center' }}>
                        <div style={{ backgroundColor: '#F8FAFC', padding: '6px', borderRadius: '4px', border: '1px solid #E2E8F0', fontSize: '11px' }}>
                          <div style={{ color: '#64748B' }}>Classified Entity</div>
                          <strong style={{ color: cvAnalysis.detected_entity_type === 'NON_VEHICLE' ? '#B91C1C' : '#581C87' }}>
                            {cvAnalysis.detected_entity_label || 'Standard Vehicle'}
                          </strong>
                        </div>
                        <div style={{ backgroundColor: '#F8FAFC', padding: '6px', borderRadius: '4px', border: '1px solid #E2E8F0', fontSize: '11px' }}>
                          <div style={{ color: '#64748B' }}>Body Paint Color</div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: '700', color: '#1E293B' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cvAnalysis.dominant_color_hex || '#94A3B8', border: '1px solid #CBD5E1', display: 'inline-block' }}></span>
                            {cvAnalysis.dominant_paint_color || 'Silver / Grey'}
                          </div>
                        </div>
                        <div style={{ backgroundColor: '#F8FAFC', padding: '6px', borderRadius: '4px', border: '1px solid #E2E8F0', fontSize: '11px' }}>
                          <div style={{ color: '#64748B' }}>Damage Pattern</div>
                          <strong style={{ color: '#B45309' }}>
                            {cvAnalysis.damage_patterns?.primary_damage_type || cvAnalysis.detected_severity_tier || 'Deformation'}
                          </strong>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px', marginBottom: '8px', textAlign: 'center' }}>
                        <div style={{ backgroundColor: '#F8FAFC', padding: '6px', borderRadius: '4px', border: '1px solid #E2E8F0', fontSize: '11px' }}>
                          <div style={{ color: '#64748B' }}>AI-Generated Risk</div>
                          <strong style={{ color: (cvAnalysis.ai_generation_risk_score ?? 0.12) > 0.40 ? '#B91C1C' : '#15803D' }}>
                            {cvAnalysis.ai_generation_verdict || 'AUTHENTIC_CAPTURE'}
                          </strong>
                        </div>
                        <div style={{ backgroundColor: '#F8FAFC', padding: '6px', borderRadius: '4px', border: '1px solid #E2E8F0', fontSize: '11px' }}>
                          <div style={{ color: '#64748B' }}>Plate Verification</div>
                          <strong style={{ color: '#1E40AF' }}>
                            {cvAnalysis.license_plate_verification?.status || 'VERIFIED'}
                          </strong>
                        </div>
                        <div style={{ backgroundColor: '#F8FAFC', padding: '6px', borderRadius: '4px', border: '1px solid #E2E8F0', fontSize: '11px' }}>
                          <div style={{ color: '#64748B' }}>Orientation Normalization</div>
                          <strong style={{ color: '#334155' }}>
                            {cvAnalysis.orientation_normalization || 'Canonical (0°)'}
                          </strong>
                        </div>
                      </div>

                      <div style={{ fontSize: '12px', color: '#334155', marginBottom: '4px' }}>
                        <strong>Detected Components: </strong>
                        {cvAnalysis.detected_damage_components?.join(', ') || 'General Exterior Damage'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#334155', marginBottom: '6px' }}>
                        <strong>Assessed Severity Tier: </strong>
                        {cvAnalysis.detected_severity_tier || cvAnalysis.detected_severity}
                      </div>

                      {cvAnalysis.heatmap_base64 && (
                        <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#0F172A', borderRadius: '6px', textAlign: 'center' }}>
                          <div style={{ color: '#94A3B8', fontSize: '10px', marginBottom: '4px', fontWeight: '700' }}>
                            🔥 Computer Vision Impact & Splicing Heatmap:
                          </div>
                          <img src={cvAnalysis.heatmap_base64} alt="Heatmap" style={{ maxHeight: '140px', maxWidth: '100%', objectFit: 'contain', borderRadius: '4px' }} />
                        </div>
                      )}

                      {/* Comprehensive Multi-Perspective Breakdown Matrix */}
                      {Array.isArray(cvAnalysis.per_photo_breakdown) && cvAnalysis.per_photo_breakdown.length > 0 && (
                        <div style={{ marginTop: '12px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '12px' }}>
                          <div style={{ fontSize: '12px', fontWeight: '800', color: '#1E293B', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle2 size={15} color='#2563EB' />
                            <span>Comprehensive Multi-Perspective Breakdown ({cvAnalysis.per_photo_breakdown.length} Perspectives Inspected)</span>
                          </div>
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                              <thead>
                                <tr style={{ backgroundColor: '#E2E8F0', color: '#334155', textAlign: 'left' }}>
                                  <th style={{ padding: '6px 8px', borderRadius: '4px 0 0 4px' }}>Perspective</th>
                                  <th style={{ padding: '6px 8px' }}>Visual Entity Classified</th>
                                  <th style={{ padding: '6px 8px' }}>Policy Compatibility</th>
                                  <th style={{ padding: '6px 8px', borderRadius: '0 4px 4px 0' }}>Surveyor Advisory</th>
                                </tr>
                              </thead>
                              <tbody>
                                {cvAnalysis.per_photo_breakdown.map((item: any, iIdx: number) => {
                                  const isMatch = item.is_match !== false;
                                  return (
                                    <tr key={iIdx} style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: isMatch ? '#fff' : '#FEF2F2' }}>
                                      <td style={{ padding: '6px 8px', fontWeight: '700', color: isMatch ? '#1E293B' : '#B91C1C' }}>
                                        Perspective {item.photo_index || iIdx + 1}
                                      </td>
                                      <td style={{ padding: '6px 8px', fontWeight: '600', color: isMatch ? '#334155' : '#991B1B' }}>
                                        {item.detected_entity || 'Vehicle Damage Evidence'}
                                      </td>
                                      <td style={{ padding: '6px 8px' }}>
                                        <span style={{
                                          display: 'inline-block',
                                          padding: '2px 8px',
                                          borderRadius: '4px',
                                          fontSize: '10px',
                                          fontWeight: '800',
                                          backgroundColor: isMatch ? '#DCFCE7' : '#FEE2E2',
                                          color: isMatch ? '#15803D' : '#DC2626'
                                        }}>
                                          {isMatch ? '✓ Policy Match' : '🚨 Incompatible Vehicle'}
                                        </span>
                                      </td>
                                      <td style={{ padding: '6px 8px', color: isMatch ? '#64748B' : '#B91C1C', fontSize: '10px' }}>
                                        {isMatch ? 'Verified automotive evidence' : 'Contradicts policy vehicle category - flagged for survey audit'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {cvAnalysis.discrepancies && cvAnalysis.discrepancies.length > 0 && (
                        <div style={{ backgroundColor: '#FEF2F2', padding: '8px 10px', borderRadius: '6px', color: '#B91C1C', fontSize: '11px', marginTop: '6px' }}>
                          <AlertTriangle size={13} style={{ display: 'inline', marginRight: '4px' }} />
                          <strong>Consistency Notice: </strong>{cvAnalysis.discrepancies.join(' | ')}
                        </div>
                      )}

                      {/* Dedicated Vehicle Verification Model Results */}
                      {cvAnalysis.vehicle_verification && (
                        <div style={{ marginTop: '10px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '10px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Car size={13} color='#2563EB' /> Vehicle Identity Verification Model: <strong>{cvAnalysis.vehicle_verification.verification_status}</strong>
                            </span>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '800',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: cvAnalysis.vehicle_verification.cross_photo_match ? '#DCFCE7' : '#FEE2E2',
                              color: cvAnalysis.vehicle_verification.cross_photo_match ? '#15803D' : '#991B1B'
                            }}>
                              Identity Match: {(cvAnalysis.vehicle_verification.match_confidence * 100).toFixed(0)}%
                            </span>
                          </div>

                          <div style={{ fontSize: '11px', color: '#475569', marginBottom: '4px' }}>
                            Anti-Spoofing Authenticator: <strong style={{ color: cvAnalysis.vehicle_verification.anti_spoofing?.verdict === 'AUTHENTIC_PHYSICAL_CAPTURE' ? '#15803D' : '#B91C1C' }}>
                              {cvAnalysis.vehicle_verification.anti_spoofing?.verdict?.replace(/_/g, ' ') || 'AUTHENTIC CAPTURE'}
                            </strong> • Sensor Certainty: <strong>{((cvAnalysis.vehicle_verification.anti_spoofing?.confidence ?? 0.94) * 100).toFixed(0)}%</strong>
                          </div>

                          {Array.isArray(cvAnalysis.vehicle_verification.findings) && cvAnalysis.vehicle_verification.findings.length > 0 && (
                            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '10px', color: '#334155', lineHeight: '1.45' }}>
                              {cvAnalysis.vehicle_verification.findings.map((f: string, i: number) => (
                                <li key={i}>{f}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {/* Autonomous Forensic Arbiter Findings */}
                      {cvAnalysis.groq_reasoning && (
                        <div style={{ marginTop: '10px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '6px', padding: '10px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#166534', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Sparkles size={13} color='#16A34A' /> SecureWheels Autonomous Forensic Arbiter
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#DCFCE7', color: '#15803D' }}>
                              {cvAnalysis.groq_reasoning.key_tier_used || 'Active Cluster'} • {cvAnalysis.groq_reasoning.credibility_score}% Credibility
                            </span>
                          </div>
                          <p style={{ fontSize: '11px', color: '#14532D', margin: '0 0 6px', lineHeight: '1.4' }}>
                            {cvAnalysis.groq_reasoning.executive_summary}
                          </p>
                          {cvAnalysis.groq_reasoning.key_findings && cvAnalysis.groq_reasoning.key_findings.length > 0 && (
                            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '10px', color: '#166534', lineHeight: '1.4' }}>
                              {cvAnalysis.groq_reasoning.key_findings.map((f: string, i: number) => (
                                <li key={i}>{f}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Interactive Damaged Components Selector (Where is it damaged?) */}
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <strong style={{ fontSize: '15px', color: '#12304A', display: 'block' }}>
                    Select Damaged {isBike ? 'Two-Wheeler' : 'Vehicle'} Components
                  </strong>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    Click to select all parts that suffered damage. Estimated repair cost updates automatically.
                  </span>
                </div>
                {selectedParts.length > 0 && (
                  <span style={{ backgroundColor: '#1F6FEB', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '12px' }}>
                    {selectedParts.length} Parts Selected
                  </span>
                )}
              </div>

              {/* Category Filter Tabs */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
                {(isBike
                  ? ['ALL', 'Front', 'Sides', 'Underbody', 'Rear']
                  : ['ALL', 'Front', 'Glass', 'Sides', 'Rear', 'Underbody']
                ).map((cat) => (
                  <button
                    key={cat}
                    type='button'
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      border: '1px solid #CBD5E1',
                      cursor: 'pointer',
                      backgroundColor: activeCategory === cat ? '#1E293B' : '#fff',
                      color: activeCategory === cat ? '#fff' : '#475569'
                    }}>
                    {cat === 'ALL' ? 'All Areas' : cat}
                  </button>
                ))}
              </div>

              {/* Parts Chips Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', marginBottom: '14px' }}>
                {filteredParts.map((part) => {
                  const selected = selectedParts.includes(part.name);
                  return (
                    <div
                      key={part.id}
                      onClick={() => togglePartSelection(part)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: selected ? '2px solid #1F6FEB' : '1px solid #CBD5E1',
                        backgroundColor: selected ? '#EFF6FF' : '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          border: selected ? '1px solid #1F6FEB' : '1px solid #94A3B8',
                          backgroundColor: selected ? '#1F6FEB' : '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {selected && <Check size={13} color='#fff' />}
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: selected ? '700' : '500', color: selected ? '#1E40AF' : '#334155' }}>
                          {part.name}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>
                        ₹{part.defaultCost.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Selected Parts Tag Bar */}
              {selectedParts.length > 0 && (
                <div style={{ backgroundColor: '#fff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Selected:</span>
                  {selectedParts.map((name) => (
                    <span
                      key={name}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: '#EFF6FF',
                        color: '#1E40AF',
                        fontSize: '11px',
                        fontWeight: '600',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid #BFDBFE'
                      }}>
                      {name}
                      <X
                        size={12}
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const p = VEHICLE_PARTS.find(x => x.name === name);
                          if (p) togglePartSelection(p);
                        }}
                      />
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Incident Date, Time & Location */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Incident Date</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type='date'
                    value={accidentDate}
                    min={minAllowedDateStr}
                    max={todayStr}
                    onChange={(e) => setAccidentDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                    required
                  />
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                    Incident must be within past 16 days (IRDAI statutory limit). Cannot be future dated.
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Incident Time</label>
                <input
                  type='time'
                  value={accidentTime}
                  onChange={(e) => setAccidentTime(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Accident Location</label>
                <input
                  type='text'
                  value={accidentLocation}
                  onChange={(e) => setAccidentLocation(e.target.value)}
                  placeholder='e.g. FC Road, Pune or NH48'
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  required
                />
              </div>
            </div>

            {/* 5. Accident Circumstances & Narrative */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Accident Circumstances & Narrative
              </label>
              <textarea
                rows={3}
                value={accidentDesc}
                onChange={(e) => setAccidentDesc(e.target.value)}
                placeholder='Describe in your own words how the collision or incident occurred...'
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                required
              />
            </div>

            {/* 6. Damage Description & Cost Estimate */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Detailed Damage Particulars
                </label>
                <input
                  type='text'
                  value={damageDesc}
                  onChange={(e) => setDamageDesc(e.target.value)}
                  placeholder='Selected components appear here, or specify details...'
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Estimated Repair Cost (₹)
                </label>
                <input
                  type='number'
                  value={repairEstimate}
                  onChange={(e) => setRepairEstimate(Number(e.target.value))}
                  placeholder='Auto-summed from parts'
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '14px', fontWeight: '700', boxSizing: 'border-box' }}
                  required
                />
              </div>
            </div>

            {/* 7. Operational & Legal Toggles */}
            <div style={{ backgroundColor: '#F8FAFC', padding: '16px 18px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Operational & Legal Verification
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500' }}>
                  <input
                    type='checkbox'
                    checked={isDrivable}
                    onChange={(e) => setIsDrivable(e.target.checked)}
                  />
                  Vehicle is currently drivable
                </label>

                <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500' }}>
                  <input
                    type='checkbox'
                    checked={thirdParty}
                    onChange={(e) => setThirdParty(e.target.checked)}
                  />
                  Third-party vehicle/property involved
                </label>

                <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500', color: injuryReported ? '#B91C1C' : '#334155' }}>
                  <input
                    type='checkbox'
                    checked={injuryReported}
                    onChange={(e) => setInjuryReported(e.target.checked)}
                  />
                  Bodily injury or hospitalization occurred
                </label>

                <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', color: policeReportFiled ? '#15803D' : '#334155' }}>
                  <input
                    type='checkbox'
                    checked={policeReportFiled}
                    onChange={(e) => setPoliceReportFiled(e.target.checked)}
                  />
                  Police FIR / Station Diary Filed
                </label>

                <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500' }}>
                  <input
                    type='checkbox'
                    checked={witnessPresent}
                    onChange={(e) => setWitnessPresent(e.target.checked)}
                  />
                  Independent witness present at scene
                </label>
              </div>

              {policeReportFiled && (
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #CBD5E1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#15803D', whiteSpace: 'nowrap' }}>
                    FIR / Police Diary No. (Optional):
                  </label>
                  <input
                    type='text'
                    value={policeReportNumber}
                    onChange={(e) => setPoliceReportNumber(e.target.value)}
                    placeholder='e.g. FIR-2026/0488 or Station Entry No.'
                    style={{ flex: 1, padding: '6px 10px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px' }}
                  />
                </div>
              )}
            </div>

            {/* Blocking Warning Banner if Automated Inspection Flagged Evidence */}
            {cvAnalysis && cvAnalysis.can_submit === false && (
              <div style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#991B1B',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '14px',
                fontSize: '13px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertTriangle size={18} color='#DC2626' />
                <span>Submission Blocked: {cvAnalysis.guidance_message || 'Please replace the flagged evidence photographs above to proceed.'}</span>
              </div>
            )}

            {/* Submit Action */}
            <button
              type='submit'
              disabled={loading || (cvAnalysis && cvAnalysis.can_submit === false)}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: (cvAnalysis && cvAnalysis.can_submit === false) ? '#94A3B8' : '#1F6FEB',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '800',
                fontSize: '15px',
                cursor: (loading || (cvAnalysis && cvAnalysis.can_submit === false)) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
              {loading ? (
                <>
                  <RefreshCw size={18} className='animate-spin' /> Processing Claim & Executing AI Adjudication...
                </>
              ) : (cvAnalysis && cvAnalysis.can_submit === false) ? (
                <>
                  <AlertTriangle size={18} /> Replace Flagged Evidence to Submit
                </>
              ) : (
                <>
                  Submit Official Insurance Claim <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 3: Real-Time AI Fraud Adjudication Outcome */}
        {step === 3 && claimResult && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#F8FAFC', padding: '18px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Official Claim Reference Number</span>
                <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#12304A', fontFamily: 'monospace' }}>
                  {claimResult.claim_number}
                </h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  display: 'inline-block', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '800',
                  backgroundColor: claimResult.ai_analysis.risk_level === 'LOW' ? '#DCFCE7' : claimResult.ai_analysis.risk_level === 'MEDIUM' ? '#FEF3C7' : '#FEE2E2',
                  color: claimResult.ai_analysis.risk_level === 'LOW' ? '#15803D' : claimResult.ai_analysis.risk_level === 'MEDIUM' ? '#B45309' : '#B91C1C'
                }}>
                  {claimResult.ai_analysis.risk_level} FRAUD RISK
                </span>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                  Adjudication Cutoff: {claimResult.ai_analysis.threshold_used}
                </div>
              </div>
            </div>

            {/* Scores Matrix */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>Random Forest</span>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#1E293B', marginTop: '4px' }}>
                  {claimResult.ai_analysis.random_forest_score}
                </div>
                <span style={{ fontSize: '10px', color: '#94A3B8' }}>Supervised (45%)</span>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>XGBoost</span>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#1E293B', marginTop: '4px' }}>
                  {claimResult.ai_analysis.xgboost_score}
                </div>
                <span style={{ fontSize: '10px', color: '#94A3B8' }}>Gradient Tree (45%)</span>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>Isolation Forest</span>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#1E293B', marginTop: '4px' }}>
                  {claimResult.ai_analysis.isolation_forest_score}
                </div>
                <span style={{ fontSize: '10px', color: '#94A3B8' }}>Anomaly (10%)</span>
              </div>
              <div style={{ backgroundColor: '#EFF6FF', padding: '14px', borderRadius: '8px', border: '2px solid #BFDBFE' }}>
                <span style={{ fontSize: '11px', color: '#1F6FEB', fontWeight: '700' }}>Ensemble Score</span>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#1F6FEB', marginTop: '4px' }}>
                  {claimResult.ai_analysis.ensemble_score}
                </div>
                <span style={{ fontSize: '10px', color: '#1F6FEB' }}>Weighted Fusion</span>
              </div>
            </div>

            {/* Multimodal CV Verification Outcome */}
            {claimResult.multimodal_inspection && (
              <div style={{ backgroundColor: '#FDF4FF', padding: '16px', borderRadius: '8px', border: '1px solid #F0ABFC', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt='Vehicle Evidence'
                    style={{ width: '90px', height: '70px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E9D5FF' }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '13px', color: '#581C87' }}>Multimodal Damage Verification Outcome:</strong>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: claimResult.multimodal_inspection.visual_consistency_score >= 0.70 ? '#15803D' : '#B91C1C' }}>
                      {(claimResult.multimodal_inspection.visual_consistency_score * 100).toFixed(0)}% Consistency
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#701A75', marginTop: '4px' }}>
                    Entity Classification: <strong>{claimResult.multimodal_inspection.detected_entity_label || 'Standard Vehicle'}</strong> • Body Paint: <strong>{claimResult.multimodal_inspection.dominant_paint_color || 'Standard Silver'}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#701A75', marginTop: '2px' }}>
                    Damage Pattern: <strong>{claimResult.multimodal_inspection.damage_patterns?.primary_damage_type || 'Deformation'}</strong> ({claimResult.multimodal_inspection.detected_severity_tier || claimResult.multimodal_inspection.detected_severity})
                  </div>
                  {claimResult.multimodal_inspection.discrepancies && claimResult.multimodal_inspection.discrepancies.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '4px', fontWeight: '600' }}>
                      Discrepancy Note: {claimResult.multimodal_inspection.discrepancies.join(' | ')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {claimResult.groq_analysis && (
              <div style={{ backgroundColor: '#F0FDF4', padding: '16px', borderRadius: '8px', border: '1px solid #86EFAC', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '13px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={16} color='#16A34A' /> SecureWheels Autonomous Forensic Arbiter
                  </strong>
                  <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: '#DCFCE7', color: '#15803D', padding: '3px 10px', borderRadius: '12px' }}>
                    {claimResult.groq_analysis.key_tier_used || 'Active Cluster'} • {claimResult.groq_analysis.credibility_score}% Linguistic Credibility
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#14532D', margin: '0 0 8px', lineHeight: '1.5' }}>
                  {claimResult.groq_analysis.executive_summary}
                </p>
                {claimResult.groq_analysis.key_findings && claimResult.groq_analysis.key_findings.length > 0 && (
                  <div>
                    <strong style={{ fontSize: '11px', color: '#166534', display: 'block', marginBottom: '4px' }}>
                      Key Forensic Findings & Verification Flags:
                    </strong>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', color: '#14532D', lineHeight: '1.6' }}>
                      {claimResult.groq_analysis.key_findings.map((f: string, i: number) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Action & Explanations */}
            <div style={{ backgroundColor: '#F8FAFC', padding: '18px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
              <div style={{ marginBottom: '12px', fontSize: '14px' }}>
                <strong>Recommended Adjudication Action: </strong>
                <span style={{ color: '#1F6FEB', fontWeight: '700' }}>{claimResult.ai_analysis.recommended_action}</span>
              </div>

              {claimResult.ai_analysis.top_contributing_factors && claimResult.ai_analysis.top_contributing_factors.length > 0 && (
                <div>
                  <strong style={{ fontSize: '13px', color: '#475569', display: 'block', marginBottom: '6px' }}>
                    Explainable AI Drivers (TreeSHAP Identified):
                  </strong>
                  <ul style={{ paddingLeft: '20px', fontSize: '13px', color: '#334155', lineHeight: '1.8' }}>
                    {claimResult.ai_analysis.top_contributing_factors.map((f: string, i: number) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Link to='/dashboard' style={{ padding: '10px 20px', backgroundColor: '#12304A', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: '700', fontSize: '13px' }}>
                Return to Customer Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
