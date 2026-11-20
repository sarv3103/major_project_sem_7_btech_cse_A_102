import re
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))

class UserRegister(BaseModel):
    full_name: str
    email: str
    mobile: str
    password: str

    @field_validator('mobile')
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        s = str(v).strip()
        if re.search(r'[a-zA-Z]', s):
            raise ValueError('Characters or letters are not allowed in mobile number. Please enter numeric digits only.')
        clean = re.sub(r'\D', '', s)
        if len(clean) != 10:
            raise ValueError('Mobile number must be exactly 10 digits.')
        if clean[0] not in '6789':
            raise ValueError('Mobile number must begin with 6, 7, 8, or 9 (Indian telecom standard).')
        return clean

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
        if not re.match(pattern, str(v).strip()):
            raise ValueError('Invalid email format. Please enter a valid address.')
        return str(v).strip().lower()

    @field_validator('full_name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        s = str(v).strip()
        if re.search(r'\d', s):
            raise ValueError('Numbers are not allowed in name.')
        if not re.match(r'^[a-zA-Z\s.]+$', s):
            raise ValueError('Special characters or symbols are not allowed in name. Use alphabetic letters only.')
        parts = [p.strip() for p in s.split() if p.strip()]
        if len(parts) < 2:
            raise ValueError("Full Name must contain at least First Name and Last Name (e.g., 'Sarvesh Kulkarni').")
        for p in parts:
            if not p[0].isupper():
                raise ValueError(f"Each part of name must start with a capital letter (e.g., '{p.capitalize()}').")
        return " ".join(parts)

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long.')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter (A-Z).')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter (a-z).')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit (0-9).')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>\-_+=\[\]\\\/]', v):
            raise ValueError('Password must contain at least one special character (e.g. @, #, $, %).')
        return v

class UserRegisterRequest(UserRegister):
    pass

class SignupSendOTP(BaseModel):
    full_name: str
    email: str
    mobile: str
    password: str

    @field_validator('full_name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        return UserRegister.validate_name(v)

    @field_validator('mobile')
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        return UserRegister.validate_mobile(v)

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        return UserRegister.validate_email(v)

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        return UserRegister.validate_password(v)

class SignupVerifyAndRegister(BaseModel):
    full_name: str
    email: str
    mobile: str
    password: str
    otp_code: str

    @field_validator('full_name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        return UserRegister.validate_name(v)

    @field_validator('mobile')
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        return UserRegister.validate_mobile(v)

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        return UserRegister.validate_email(v)

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        return UserRegister.validate_password(v)

    @field_validator('otp_code')
    @classmethod
    def validate_otp(cls, v: str) -> str:
        clean = re.sub(r'\D', '', str(v))
        if len(clean) != 6:
            raise ValueError('OTP must be a 6-digit numeric verification code.')
        return clean

class UserLogin(BaseModel):
    identifier: Optional[str] = None
    email_or_mobile: Optional[str] = None
    password: str

    def get_login_identifier(self) -> str:
        s = (self.identifier or self.email_or_mobile or '').strip()
        if '@' in s:
            pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
            if not re.match(pattern, s):
                raise ValueError('Invalid email format.')
            return s.lower()
        else:
            clean = re.sub(r'\D', '', s)
            if len(clean) != 10:
                raise ValueError('Mobile identifier must be exactly 10 digits.')
            if clean[0] not in '6789':
                raise ValueError('Mobile number must begin with 6, 7, 8, or 9.')
            return clean

class UserLoginRequest(UserLogin):
    pass

class VehicleCreate(BaseModel):
    registration_number: str
    vehicle_type: str = "Car"
    manufacturer: str
    model: str
    manufacturing_year: int
    fuel_type: str = "Petrol"
    estimated_idv: float

    @field_validator('registration_number')
    @classmethod
    def validate_reg(cls, v: str) -> str:
        clean = re.sub(r'[\s\-]', '', str(v)).upper()
        # Strict Indian RTO standard: Valid State + 1-2 Digit District + 1-3 Letter Series + 4 Digits OR Bharat Series (22BH1234AA)
        valid_states = r'(?:AN|AP|AR|AS|BR|CG|CH|DD|DL|DN|GA|GJ|HR|HP|JH|JK|KA|KL|LA|LD|MP|MH|MN|ML|MZ|NL|OD|PB|PY|RJ|SK|TN|TR|TS|UK|UP|WB)'
        rto_pattern = rf'^({valid_states}[0-9]{{1,2}}[A-Z]{{1,3}}[0-9]{{4}}|[0-9]{{2}}BH[0-9]{{4}}[A-Z]{{1,2}})$'
        if not re.match(rto_pattern, clean):
            raise ValueError(f"Invalid Indian vehicle registration format: '{v}'. Must be a valid RTO plate (e.g. 'MH12AB1234' or '22BH1234AA') with valid state code, series letters, and 4 digits.")
        return clean

    @field_validator('manufacturing_year')
    @classmethod
    def validate_year(cls, v: int) -> int:
        cur_year = datetime.now(IST).year
        if v < 1990 or v > cur_year:
            raise ValueError(f'Manufacturing year must be between 1990 and {cur_year}.')
        return v

    @field_validator('estimated_idv')
    @classmethod
    def validate_idv(cls, v: float) -> float:
        if v < 10000 or v > 20000000:
            raise ValueError('Declared vehicle value must be between ₹10,000 and ₹2,00,00,000.')
        return v

class PolicyCreate(BaseModel):
    vehicle_id: str
    duration_years: int = 1
    plan_type: str = "COMPREHENSIVE"
    calculated_premium: float
    prototype_amount_paid: float = 1.0
    declared_idv: Optional[float] = None
    statutory_idv: Optional[float] = None
    underwriting_notes: Optional[str] = None

class PolicyCreateRequest(PolicyCreate):
    pass

class VehicleIDVCalculationRequest(BaseModel):
    make: str
    model: str
    manufacturing_year: int
    declared_idv: Optional[float] = None

class ClaimInitiateOTP(BaseModel):
    mobile_or_email: str

    @field_validator('mobile_or_email')
    @classmethod
    def validate_contact(cls, v: str) -> str:
        s = str(v).strip()
        if '@' in s:
            pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
            if not re.match(pattern, s):
                raise ValueError('Invalid email format.')
            return s.lower()
        else:
            clean = re.sub(r'\D', '', s)
            if len(clean) != 10:
                raise ValueError('Mobile number must be exactly 10 digits.')
            if clean[0] not in '6789':
                raise ValueError('Mobile number must begin with 6, 7, 8, or 9.')
            return clean

class ClaimVerifyOTP(BaseModel):
    mobile_or_email: str
    otp: Optional[str] = None
    otp_code: Optional[str] = None

    def get_otp_code(self) -> str:
        val = (self.otp or self.otp_code or "").strip()
        clean = re.sub(r'\D', '', val)
        if len(clean) < 4 or len(clean) > 8:
            raise ValueError('Verification OTP must be 4 to 6 numeric digits.')
        return clean


class ClaimSubmit(BaseModel):
    policy_id: str
    accident_date: str
    accident_time: str
    accident_location: str
    incident_description: str
    damage_description: str
    estimated_repair_cost: float
    is_drivable: bool = False
    third_party_involved: bool = False
    injury_reported: bool = False
    fatality_reported: bool = False
    police_report_filed: bool = False
    witness_present: bool = False
    fault: str = "Policy Holder"
    accident_area: str = "Urban"
    damage_image_url: Optional[str] = None
    damage_image_urls: Optional[List[str]] = None

class AdminDecision(BaseModel):
    claim_id: str
    decision: str
    override_reason: Optional[str] = None
    investigator_notes: Optional[str] = None

class SupportTicketCreate(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    mobile: Optional[str] = None
    user_id: Optional[str] = None
    category: str = "General Inquiry"
    subject: str
    message: str
    policy_id: Optional[str] = None
    claim_id: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_support_email(cls, v: str) -> str:
        pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
        if not re.match(pattern, str(v).strip()):
            raise ValueError("Invalid email format.")
        return str(v).strip().lower()

    @field_validator("phone", "mobile")
    @classmethod
    def validate_support_contact(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        clean = re.sub(r"\D", "", str(v))
        if len(clean) != 10:
            raise ValueError("Mobile number must be exactly 10 digits.")
        if clean[0] not in "6789":
            raise ValueError("Mobile number must begin with 6, 7, 8, or 9.")
        return clean

class TicketReply(BaseModel):
    reply_message: str
    new_status: str = "RESOLVED"

class DirectEmailSend(BaseModel):
    to_email: str
    subject: str
    body: str
    to_name: Optional[str] = "Valued Policyholder"

    @field_validator('to_email')
    @classmethod
    def validate_to_email(cls, v: str) -> str:
        pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
        if not re.match(pattern, str(v).strip()):
            raise ValueError('Invalid recipient email address.')
        return str(v).strip().lower()

class RazorpayOrderCreate(BaseModel):
    amount_inr: Optional[float] = None
    amount: Optional[int] = None  # in paise
    currency: Optional[str] = "INR"
    receipt: Optional[str] = None
    policy_id: Optional[str] = None
    customer_name: Optional[str] = "Customer"
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None

class RazorpayPaymentVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    policy_id: Optional[str] = None

class PolicyUnderwritingAction(BaseModel):
    action: str  # "APPROVE" or "ADJUST_IDV" or "REJECT"
    revised_idv: Optional[float] = None
    notes: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
        if not re.match(pattern, str(v).strip()):
            raise ValueError('Invalid email format. Please enter a valid address.')
        return str(v).strip().lower()

class ForgotPasswordReset(BaseModel):
    email: str
    otp_code: str
    new_password: str

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
        if not re.match(pattern, str(v).strip()):
            raise ValueError('Invalid email format.')
        return str(v).strip().lower()

    @field_validator('otp_code')
    @classmethod
    def validate_otp(cls, v: str) -> str:
        clean = re.sub(r'\D', '', str(v))
        if len(clean) < 4 or len(clean) > 8:
            raise ValueError('OTP must be a valid numeric code.')
        return clean

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        return UserRegister.validate_password(v)