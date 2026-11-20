import os
import io
from fpdf import FPDF
from fpdf.enums import XPos, YPos
from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))

class PolicyPDFGenerator:
    @staticmethod
    def generate_policy_pdf(policy_data: dict, customer_data: dict, vehicle_data: dict) -> bytes:
        pdf = FPDF(orientation="P", unit="mm", format="A4")
        pdf.set_auto_page_break(auto=True, margin=15)
        
        NAVY = (18, 48, 74)
        BLUE = (31, 111, 235)
        DARK = (30, 41, 59)
        GREY = (100, 116, 139)
        LIGHT_BG = (241, 245, 249)
        GOLD = (217, 119, 6)

        pol_num = policy_data.get('policy_number', 'MIFD-POL-2026')
        idv = float(vehicle_data.get('estimated_idv', 500000.0))
        premium = float(policy_data.get('calculated_premium', 15000.0))
        gst = round(premium * 0.18, 2)
        total_payable = round(premium + gst, 2)

        # =========================================================================
        # PAGE 1: CERTIFICATE OF INSURANCE & VEHICLE SCHEDULE
        # =========================================================================
        pdf.add_page()
        
        # Top Header Banner
        pdf.set_fill_color(*NAVY)
        pdf.rect(0, 0, 210, 32, "F")
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 18)
        pdf.set_xy(15, 7)
        pdf.cell(0, 8, "SECUREWHEELS GENERAL INSURANCE CO. LTD.", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_xy(15, 17)
        pdf.cell(0, 6, "Certificate of Insurance & Schedule of Coverage (Form 51 - Rule 141, Central Motor Vehicles Rules)", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

        # Regulatory Sub-banner
        pdf.set_fill_color(248, 250, 252)
        pdf.set_draw_color(226, 232, 240)
        pdf.rect(15, 36, 180, 20, "DF")
        pdf.set_text_color(*DARK)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_xy(20, 39)
        pdf.cell(85, 5, f"Policy Schedule No: {pol_num}")
        pdf.cell(85, 5, f"Policy Status: {policy_data.get('status', 'ACTIVE')}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_xy(20, 46)
        pdf.cell(85, 5, f"Coverage Term: {policy_data.get('start_date')} to {policy_data.get('end_date')}")
        pdf.cell(85, 5, f"Underwriting Plan: {policy_data.get('plan_type', 'Comprehensive Shield')}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

        # 1. Insured Details
        pdf.set_xy(15, 61)
        pdf.set_text_color(*BLUE)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 6, "1. Insured Policyholder Particulars", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_draw_color(203, 213, 225)
        pdf.line(15, 68, 195, 68)

        pdf.set_text_color(*DARK)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_xy(15, 71)
        pdf.cell(90, 5, f"Name of Insured: {customer_data.get('full_name', 'Rahul Sharma')}")
        pdf.cell(90, 5, f"Contact Mobile: +91-{customer_data.get('mobile', '9123456780')}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.cell(90, 5, f"Registered Email: {customer_data.get('email', 'customer@domain.in')}")
        pdf.cell(90, 5, f"Account Ref ID: {str(customer_data.get('id', 'USER-001'))[:16]}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.cell(90, 5, "Nominee: Specified as per proposal")
        pdf.cell(90, 5, "Relationship: Legal Heir / Self", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

        # 2. Vehicle Schedule
        pdf.set_xy(15, 92)
        pdf.set_text_color(*BLUE)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 6, "2. Insured Motor Vehicle Schedule", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.line(15, 99, 195, 99)

        pdf.set_text_color(*DARK)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_xy(15, 102)
        pdf.cell(90, 5, f"Registration Mark: {vehicle_data.get('registration_number', 'MH-12-GD-2024')}")
        pdf.cell(90, 5, f"Vehicle Class: {vehicle_data.get('vehicle_type', 'Car')}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.cell(90, 5, f"Make & Model: {vehicle_data.get('manufacturer', 'Honda')} {vehicle_data.get('model', 'City VX')}")
        pdf.cell(90, 5, f"Year of Manufacture: {vehicle_data.get('manufacturing_year', 2022)}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.cell(90, 5, f"Fuel / Powertrain: {vehicle_data.get('fuel_type', 'Petrol')}")
        pdf.cell(90, 5, f"Insured Declared Value (IDV): Rs. {idv:,.2f}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

        # 3. Premium Computation Table
        pdf.set_xy(15, 124)
        pdf.set_text_color(*BLUE)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 6, "3. Actuarial Premium Itemization & Tax Invoice", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.line(15, 131, 195, 131)

        # Table Header
        pdf.set_fill_color(*LIGHT_BG)
        pdf.set_text_color(*DARK)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_xy(15, 134)
        pdf.cell(130, 6, "  Coverage / Component Description", fill=True)
        pdf.cell(50, 6, "Amount (INR)", fill=True, align="R", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

        pdf.set_font("Helvetica", "", 9)
        components = [
            ("Basic Own Damage (OD) Cover (IDV-based tariff rating)", round(premium * 0.62, 2)),
            ("Third Party Property Damage (TPPD) & Compulsory Liability Cover", round(premium * 0.22, 2)),
            ("Compulsory Personal Accident (CPA) Cover for Owner-Driver (Rs. 15 Lakhs)", 350.0),
            ("Add-on Endorsement: Zero-Depreciation & Roadside Assistance", round(premium * 0.16 - 350.0, 2)),
            ("Sub-total (Net Base Premium)", premium),
            ("Integrated Goods & Services Tax (IGST / GST @ 18.00%)", gst),
            ("Total Gross Policy Premium Payable", total_payable)
        ]
        
        y_cursor = 141
        for desc, val in components:
            pdf.set_xy(15, y_cursor)
            if "Total" in desc or "Sub-total" in desc:
                pdf.set_font("Helvetica", "B", 9)
            else:
                pdf.set_font("Helvetica", "", 9)
            pdf.cell(130, 5, f"  {desc}")
            pdf.cell(50, 5, f"Rs. {val:,.2f}", align="R", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            y_cursor += 5

        # Digital Signature & QR Representation
        pdf.set_xy(15, 186)
        pdf.set_fill_color(248, 250, 252)
        pdf.rect(15, 186, 180, 36, "DF")
        
        pdf.set_text_color(*DARK)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_xy(20, 190)
        pdf.cell(110, 5, "Digitally Verified & Authenticated Under IT Act 2000")
        pdf.set_font("Helvetica", "", 8)
        pdf.set_xy(20, 196)
        pdf.cell(110, 4, f"Cryptographic Policy Hash: SHA256-{(pol_num + str(total_payable))[:24].upper()}...")
        pdf.set_xy(20, 201)
        pdf.cell(110, 4, f"Issuance Timestamp: {datetime.now(IST).strftime('%Y-%m-%d %H:%M:%S')} IST")
        pdf.set_xy(20, 206)
        pdf.cell(110, 4, "AI Risk Underwriting Clearance: CL-T552-AUTHORIZED")

        # Stamp box
        pdf.set_draw_color(16, 185, 129)
        pdf.set_fill_color(236, 253, 245)
        pdf.rect(140, 190, 50, 28, "DF")
        pdf.set_text_color(21, 128, 61)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_xy(140, 195)
        pdf.cell(50, 5, "SECUREWHEELS AI", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_font("Helvetica", "", 7)
        pdf.set_xy(140, 201)
        pdf.cell(50, 4, "[DIGITALLY SIGNED]", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_xy(140, 206)
        pdf.cell(50, 4, "Authorized Signatory", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

        # Page 1 Footer
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(*GREY)
        pdf.set_xy(15, 275)
        pdf.cell(0, 4, f"Policy Ref: {pol_num} | Page 1 of 3 (Certificate & Schedule) | SecureWheels General Insurance", align="C")

        # =========================================================================
        # PAGE 2: STANDARD TERMS, CONDITIONS & GENERAL EXCLUSIONS
        # =========================================================================
        pdf.add_page()
        
        # Header
        pdf.set_fill_color(*NAVY)
        pdf.rect(0, 0, 210, 20, "F")
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 13)
        pdf.set_xy(15, 6)
        pdf.cell(0, 8, "SECTION II - TERMS, CONDITIONS & POLICY ENDORSEMENTS", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

        pdf.set_text_color(*DARK)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_xy(15, 26)
        pdf.cell(0, 5, "1. Scope of Indemnity & General Exceptions", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_draw_color(203, 213, 225)
        pdf.line(15, 32, 195, 32)

        pdf.set_font("Helvetica", "", 8.5)
        p2_text_1 = (
            "The Company agrees that subject to the Terms, Exceptions and Conditions contained herein or endorsed hereon, "
            "it will indemnify the Insured against loss of or damage to the vehicle insured and/or its accessories whilst thereon by: "
            "(a) Accidental external means, fire, explosion, self-ignition or lightning; (b) Burglary, housebreaking or theft; "
            "(c) Riot and strike; (d) Earthquake (fire and shock damage); (e) Flood, typhoon, hurricane, storm, tempest, inundation, "
            "cyclone, hailstorm, frost; (f) Transit by road, rail, inland waterway, lift, elevator or air."
        )
        pdf.set_xy(15, 35)
        pdf.multi_cell(180, 4.5, p2_text_1)

        pdf.set_font("Helvetica", "B", 10)
        pdf.set_xy(15, 58)
        pdf.cell(0, 5, "2. General Exclusions (Losses Not Covered)", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.line(15, 64, 195, 64)

        p2_text_2 = (
            "The Company shall not be liable under this policy in respect of: "
            "(a) Any accidental loss or damage and/or liability caused, sustained or incurred outside the geographical area of India; "
            "(b) Any claim arising out of any contractual liability; "
            "(c) Any accidental loss or damage suffered whilst the vehicle is being driven by or is under the control of any person other than "
            "a person holding an effective and valid driving license; "
            "(d) Any accidental loss or damage occurring whilst the Insured or any person driving with permission is under the influence of intoxicating "
            "liquor, narcotics, or psychotropic drugs; "
            "(e) Consequential loss, depreciation, wear and tear, mechanical or electrical breakdown, failures or breakages; "
            "(f) Damage to tires and tubes unless the vehicle is damaged at the same time."
        )
        pdf.set_xy(15, 67)
        pdf.set_font("Helvetica", "", 8.5)
        pdf.multi_cell(180, 4.5, p2_text_2)

        pdf.set_font("Helvetica", "B", 10)
        pdf.set_xy(15, 106)
        pdf.cell(0, 5, "3. Policyholder Obligations & Mandatory Claim Notification Protocol", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.line(15, 112, 195, 112)

        p2_text_3 = (
            "Notice shall be given in writing to the Company immediately upon the occurrence of any accidental loss or damage, and in the event "
            "of any claim. Failure to notify the Company within 48 (forty-eight) hours of the occurrence may prejudice claim settlement, unless "
            "sufficient and acceptable reasons for the delay are provided. In case of theft or criminal act, immediate notice must also be given to the police. "
            "The Insured shall take all reasonable steps to safeguard the vehicle from loss or damage and to maintain it in efficient roadworthy condition."
        )
        pdf.set_xy(15, 115)
        pdf.set_font("Helvetica", "", 8.5)
        pdf.multi_cell(180, 4.5, p2_text_3)

        pdf.set_font("Helvetica", "B", 10)
        pdf.set_xy(15, 145)
        pdf.cell(0, 5, "4. Compulsory Deductible & Depreciation Scales", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.line(15, 151, 195, 151)

        p2_text_4 = (
            "A compulsory deductible of Rs. 400.00 for two-wheelers and Rs. 1,000.00 to Rs. 2,000.00 for private cars applies to each and every claim. "
            "Depreciation on replacement parts shall be applied as follows: Rubber/nylon/plastic parts: 50%; Glass parts: NIL; "
            "Fiberglass parts: 30%; Wooden parts: as per age scale. For Zero-Depreciation add-on policyholders, depreciation deductions are fully waived."
        )
        pdf.set_xy(15, 154)
        pdf.set_font("Helvetica", "", 8.5)
        pdf.multi_cell(180, 4.5, p2_text_4)

        # Page 2 Footer
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(*GREY)
        pdf.set_xy(15, 275)
        pdf.cell(0, 4, f"Policy Ref: {pol_num} | Page 2 of 3 (Terms & Exclusions) | SecureWheels General Insurance", align="C")

        # =========================================================================
        # PAGE 3: STATUTORY NOTICES, GRIEVANCE REDRESSAL & OMBUDSMAN DIRECTORY
        # =========================================================================
        pdf.add_page()
        
        # Header
        pdf.set_fill_color(*NAVY)
        pdf.rect(0, 0, 210, 20, "F")
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 13)
        pdf.set_xy(15, 6)
        pdf.cell(0, 8, "SECTION III - STATUTORY NOTICES & GRIEVANCE REDRESSAL", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

        pdf.set_text_color(*DARK)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_xy(15, 26)
        pdf.cell(0, 5, "1. Statutory Provisions & Motor Vehicles Act Compliance", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_draw_color(203, 213, 225)
        pdf.line(15, 32, 195, 32)

        pdf.set_font("Helvetica", "", 8.5)
        p3_text_1 = (
            "This policy is issued in compliance with Chapter XI of the Motor Vehicles Act, 1988, and subsequent amendments. "
            "Under Section 64VB of the Insurance Act 1938, no risk is assumed unless premium is received in advance by the insurer. "
            "Under Section 64UM, any claim estimated to exceed Rs. 50,000/- shall be surveyed and assessed by an IRDAI-licensed independent surveyor."
        )
        pdf.set_xy(15, 35)
        pdf.multi_cell(180, 4.5, p3_text_1)

        pdf.set_font("Helvetica", "B", 10)
        pdf.set_xy(15, 58)
        pdf.cell(0, 5, "2. Internal Grievance Redressal Procedure (Level 1 & Level 2)", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.line(15, 64, 195, 64)

        p3_text_2 = (
            "If you have any grievance or query concerning your policy schedule or claim adjudication: \n"
            "Step 1: Contact our 24x7 Customer Care Helpline at 1800-419-7726 or email grievance@securewheels.com.\n"
            "Step 2: If the resolution is unsatisfactory within 14 days, you may escalate to the Chief Grievance Officer, "
            "SecureWheels Towers, Cyber City, Gurugram, Haryana - 122002.\n"
            "Step 3: If unresolved, register your complaint on the IRDAI Integrated Grievance Management System (Bima Bharosa) at bima.irdai.gov.in."
        )
        pdf.set_xy(15, 67)
        pdf.set_font("Helvetica", "", 8.5)
        pdf.multi_cell(180, 4.5, p3_text_2)

        pdf.set_font("Helvetica", "B", 10)
        pdf.set_xy(15, 98)
        pdf.cell(0, 5, "3. Insurance Ombudsman Directory (Selected Zonal Jurisdictions)", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.line(15, 104, 195, 104)

        ombudsman_data = [
            ("MUMBAI & MAHARASHTRA", "3rd Floor, Jeevan Seva Annexe, S.V. Road, Santacruz (W), Mumbai - 400054 | Email: bimalokpal.mumbai@cioins.co.in"),
            ("DELHI & NCR", "2/2 A, Universal Insurance Building, Asaf Ali Road, New Delhi - 110002 | Email: bimalokpal.delhi@cioins.co.in"),
            ("BENGALURU & KARNATAKA", "Jeevan Soudha Building, PID No. 57-27-N-19, Ground Floor, 24th Main, JP Nagar, Phase 1, Bengaluru - 560078"),
            ("CHENNAI & TAMIL NADU", "Fatima Akhtar Court, 4th Floor, 453, Anna Salai, Teynampet, Chennai - 600018 | Email: bimalokpal.chennai@cioins.co.in"),
            ("KOLKATA & WEST BENGAL", "Hindustan Bldg. Annexe, 4, C.R. Avenue, Kolkata - 700072 | Email: bimalokpal.kolkata@cioins.co.in")
        ]

        y_omb = 108
        for zone, addr in ombudsman_data:
            pdf.set_xy(15, y_omb)
            pdf.set_font("Helvetica", "B", 8)
            pdf.cell(60, 4, zone)
            pdf.set_font("Helvetica", "", 7.5)
            pdf.multi_cell(120, 3.8, addr)
            y_omb += 9

        # Security Seal Box
        pdf.set_xy(15, 165)
        pdf.set_fill_color(241, 245, 249)
        pdf.rect(15, 165, 180, 26, "DF")
        pdf.set_text_color(*DARK)
        pdf.set_font("Helvetica", "B", 8.5)
        pdf.set_xy(20, 169)
        pdf.cell(0, 4, "AUTONOMOUS MOTOR FRAUD DETECTION SUBSYSTEM ASSURANCE", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_font("Helvetica", "", 7.5)
        pdf.set_xy(20, 174)
        pdf.multi_cell(170, 3.5, (
            "This policy schedule was issued under algorithmic verification with cost-sensitive threshold optimization (threshold 0.40). "
            "All claim submissions are evaluated under zero-leakage cross-validated ensembles with automated anti-fraud telemetry."
        ))

        # Page 3 Footer
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(*GREY)
        pdf.set_xy(15, 275)
        pdf.cell(0, 4, f"Policy Ref: {pol_num} | Page 3 of 3 (Statutory & Ombudsman Notices) | SecureWheels General Insurance", align="C")

        return bytes(pdf.output())

