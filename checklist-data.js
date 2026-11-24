/* Checklist text imported from the four supplied worksheets. */
(function(root){
  const sheets = [
  {
    "id": "hdb-seller",
    "name": "HDB Seller",
    "sourceSheet": "HDB Seller",
    "groups": [
      {
        "id": "hdb-seller-a3",
        "title": "Seller Eligibility",
        "items": [
          {
            "id": "hdb-seller-a4",
            "text": "MOP fulfilled (5 years)",
            "cell": "A4"
          },
          {
            "id": "hdb-seller-a5",
            "text": "No private property owned within MOP period",
            "cell": "A5"
          },
          {
            "id": "hdb-seller-a6",
            "text": "All owners agree to sell",
            "cell": "A6"
          },
          {
            "id": "hdb-seller-a7",
            "text": "Apply for Intent to Sell",
            "cell": "A7"
          }
        ]
      },
      {
        "id": "hdb-seller-a9",
        "title": "Financial & Loan Matters",
        "items": [
          {
            "id": "hdb-seller-a10",
            "text": "Outstanding Bank loan or HDB loan",
            "cell": "A10"
          },
          {
            "id": "hdb-seller-a11",
            "text": "Lock-in period and redemption penalty (bank loans)",
            "cell": "A11"
          },
          {
            "id": "hdb-seller-a12",
            "text": "CPF refund amount",
            "cell": "A12"
          },
          {
            "id": "hdb-seller-a13",
            "text": "If is using CPF (> 55 years old), check CPF board first before issue OTP",
            "cell": "A13"
          }
        ]
      },
      {
        "id": "hdb-seller-a15",
        "title": "Grants and Subsidy Recovery",
        "items": [
          {
            "id": "hdb-seller-a16",
            "text": "Check if seller previously took any grants",
            "cell": "A16"
          },
          {
            "id": "hdb-seller-a17",
            "text": "Resale levy may apply if upgrading to new BTO/EC.",
            "cell": "A17"
          }
        ]
      },
      {
        "id": "hdb-seller-a19",
        "title": "Occupier & Household Changes",
        "items": [
          {
            "id": "hdb-seller-a20",
            "text": "Divorce situations: Need Interim Judgment, Final Judgment, Order of Court",
            "cell": "A20"
          },
          {
            "id": "hdb-seller-a21",
            "text": "Deceased owner: Need Probate / Letters of Administration",
            "cell": "A21"
          },
          {
            "id": "hdb-seller-a22",
            "text": "Minor owner: Court order required",
            "cell": "A22"
          }
        ]
      },
      {
        "id": "hdb-seller-a24",
        "title": "Property Details",
        "items": [
          {
            "id": "hdb-seller-a25",
            "text": "Flat type",
            "cell": "A25"
          },
          {
            "id": "hdb-seller-a26",
            "text": "Floor area",
            "cell": "A26"
          },
          {
            "id": "hdb-seller-a27",
            "text": "Lease commencement year",
            "cell": "A27"
          },
          {
            "id": "hdb-seller-a28",
            "text": "Remaining lease",
            "cell": "A28"
          },
          {
            "id": "hdb-seller-a29",
            "text": "Ethnic Integration Policy (EIP) quota checked",
            "cell": "A29"
          },
          {
            "id": "hdb-seller-a30",
            "text": "HIP / LUP / upgrading completed and paid?",
            "cell": "A30"
          },
          {
            "id": "hdb-seller-a31",
            "text": "Extension required?",
            "cell": "A31"
          },
          {
            "id": "hdb-seller-a32",
            "text": "Contra transaction?",
            "cell": "A32"
          }
        ]
      },
      {
        "id": "hdb-seller-a34",
        "title": "Buyer Eligibility Check",
        "items": [
          {
            "id": "hdb-seller-a35",
            "text": "Before issuing OTP, confirm buyer can purchase.",
            "cell": "A35"
          },
          {
            "id": "hdb-seller-a36",
            "text": "HFE done",
            "cell": "A36"
          },
          {
            "id": "hdb-seller-a37",
            "text": "Ethnic Integration Policy (EIP) quota checked",
            "cell": "A37"
          },
          {
            "id": "hdb-seller-a38",
            "text": "Singapore PR Quota checked",
            "cell": "A38"
          }
        ]
      },
      {
        "id": "hdb-seller-a40",
        "title": "Timeline",
        "items": [
          {
            "id": "hdb-seller-a41",
            "text": "To request for extension from HDB officially, purchased OTP must exercised",
            "cell": "A41"
          }
        ]
      },
      {
        "id": "hdb-seller-a43",
        "title": "Key Handover Checklist",
        "items": [
          {
            "id": "hdb-seller-a44",
            "text": "Remove furniture",
            "cell": "A44"
          },
          {
            "id": "hdb-seller-a45",
            "text": "All keys including letterbox",
            "cell": "A45"
          },
          {
            "id": "hdb-seller-a46",
            "text": "Utility accounts terminated after inspection",
            "cell": "A46"
          }
        ]
      }
    ],
    "title": "HDB Sales"
  },
  {
    "id": "hdb-buyer",
    "name": "HDB Buyer",
    "sourceSheet": "HDB Buyer ",
    "groups": [
      {
        "id": "hdb-buyer-a3",
        "title": "Buyer Eligibility Check",
        "items": [
          {
            "id": "hdb-buyer-a4",
            "text": "At least one Singapore Citizen",
            "cell": "A4"
          },
          {
            "id": "hdb-buyer-a5",
            "text": "PR buyers must purchase with a Singapore Citizen (extra premium $10,000)",
            "cell": "A5"
          },
          {
            "id": "hdb-buyer-a6",
            "text": "Non Citizen must purchase with a Singapore Citizen (extra premium $15,000)",
            "cell": "A6"
          },
          {
            "id": "hdb-buyer-a7",
            "text": "PR couples must be at least 3 years (extra premium $10,000)",
            "cell": "A7"
          },
          {
            "id": "hdb-buyer-a8",
            "text": "Buyer does not own private property",
            "cell": "A8"
          },
          {
            "id": "hdb-buyer-a9",
            "text": "Buyer did not dispose private property within last 15 months (if applicable)",
            "cell": "A9"
          },
          {
            "id": "hdb-buyer-a10",
            "text": "Apply for HFE",
            "cell": "A10"
          }
        ]
      },
      {
        "id": "hdb-buyer-a12",
        "title": "Financial & Loan Matters",
        "items": [
          {
            "id": "hdb-buyer-a13",
            "text": "Check HFE letter for Loan or IPA for bank loan",
            "cell": "A13"
          },
          {
            "id": "hdb-buyer-a14",
            "text": "If want to take HDB loan, must dispose private property 30 months before",
            "cell": "A14"
          }
        ]
      },
      {
        "id": "hdb-buyer-a16",
        "title": "HDB Loan",
        "items": [
          {
            "id": "hdb-buyer-a17",
            "text": "Income ceiling within limit",
            "cell": "A17"
          },
          {
            "id": "hdb-buyer-a18",
            "text": "Buyer has not taken more than 2 HDB loans",
            "cell": "A18"
          },
          {
            "id": "hdb-buyer-a20",
            "text": "If is using CPF (> 55 years old), check CPF board first",
            "cell": "A20"
          }
        ]
      },
      {
        "id": "hdb-buyer-a22",
        "title": "Grants and Subsidy Recovery",
        "items": [
          {
            "id": "hdb-buyer-a23",
            "text": "Check if buyer previously took any grants",
            "cell": "A23"
          },
          {
            "id": "hdb-buyer-a24",
            "text": "Resale levy may apply if upgrading to new BTO/EC.",
            "cell": "A24"
          },
          {
            "id": "hdb-buyer-a25",
            "text": "If want to take HDB grant, must dispose private property 30 months before",
            "cell": "A25"
          }
        ]
      },
      {
        "id": "hdb-buyer-a27",
        "title": "Property Details",
        "items": [
          {
            "id": "hdb-buyer-a28",
            "text": "Flat type",
            "cell": "A28"
          },
          {
            "id": "hdb-buyer-a29",
            "text": "Floor area",
            "cell": "A29"
          },
          {
            "id": "hdb-buyer-a30",
            "text": "Lease commencement year",
            "cell": "A30"
          },
          {
            "id": "hdb-buyer-a31",
            "text": "Remaining lease (Check if affect loan and CPF limit)",
            "cell": "A31"
          },
          {
            "id": "hdb-buyer-a32",
            "text": "Ethnic Integration Policy (EIP) quota checked",
            "cell": "A32"
          },
          {
            "id": "hdb-buyer-a33",
            "text": "Singapore PR Quota checked",
            "cell": "A33"
          },
          {
            "id": "hdb-buyer-a34",
            "text": "HIP / LUP / upgrading completed and paid?",
            "cell": "A34"
          },
          {
            "id": "hdb-buyer-a35",
            "text": "Extension required?",
            "cell": "A35"
          },
          {
            "id": "hdb-buyer-a36",
            "text": "Contra transaction?",
            "cell": "A36"
          }
        ]
      },
      {
        "id": "hdb-buyer-a38",
        "title": "Key Handover Checklist",
        "items": [
          {
            "id": "hdb-buyer-a39",
            "text": "Remove furniture",
            "cell": "A39"
          },
          {
            "id": "hdb-buyer-a40",
            "text": "All keys including letterbox",
            "cell": "A40"
          },
          {
            "id": "hdb-buyer-a41",
            "text": "Utility accounts applied",
            "cell": "A41"
          }
        ]
      }
    ],
    "title": "HDB Purchase"
  },
  {
    "id": "private-seller",
    "name": "Private Seller",
    "sourceSheet": "Private Seller",
    "groups": [
      {
        "id": "private-seller-a3",
        "title": "Seller Eligibility",
        "items": [
          {
            "id": "private-seller-a4",
            "text": "Confirm ownership details (INLIS)",
            "cell": "A4"
          },
          {
            "id": "private-seller-a5",
            "text": "All owners agree to sell",
            "cell": "A5"
          },
          {
            "id": "private-seller-a6",
            "text": "Any SSD (3 or 4 years)",
            "cell": "A6"
          }
        ]
      },
      {
        "id": "private-seller-a8",
        "title": "Occupier & Household Changes",
        "items": [
          {
            "id": "private-seller-a9",
            "text": "Divorce situations: Need Interim Judgment, Final Judgment, Order of Court",
            "cell": "A9"
          },
          {
            "id": "private-seller-a10",
            "text": "Deceased owner: Need Probate / Letters of Administration",
            "cell": "A10"
          },
          {
            "id": "private-seller-a11",
            "text": "Minor owner: Court order required",
            "cell": "A11"
          },
          {
            "id": "private-seller-a12",
            "text": "Bankruptcy check",
            "cell": "A12"
          },
          {
            "id": "private-seller-a13",
            "text": "Confirm if property held under company / trust",
            "cell": "A13"
          }
        ]
      },
      {
        "id": "private-seller-a15",
        "title": "Financial & Loan Matters",
        "items": [
          {
            "id": "private-seller-a16",
            "text": "Outstanding loan amount",
            "cell": "A16"
          },
          {
            "id": "private-seller-a17",
            "text": "Lock-in period and redemption penalty (if applicable)",
            "cell": "A17"
          },
          {
            "id": "private-seller-a18",
            "text": "Notice period for redemption (if applicable)",
            "cell": "A18"
          },
          {
            "id": "private-seller-a19",
            "text": "CPF refund amount",
            "cell": "A19"
          },
          {
            "id": "private-seller-a20",
            "text": "If is using CPF (> 55 years old), check CPF board first before issue OTP",
            "cell": "A20"
          }
        ]
      },
      {
        "id": "private-seller-a22",
        "title": "Property Details",
        "items": [
          {
            "id": "private-seller-a23",
            "text": "Maintenance fees",
            "cell": "A23"
          },
          {
            "id": "private-seller-a24",
            "text": "Lease commencement year",
            "cell": "A24"
          },
          {
            "id": "private-seller-a25",
            "text": "Remaining lease",
            "cell": "A25"
          },
          {
            "id": "private-seller-a26",
            "text": "Extension required?",
            "cell": "A26"
          },
          {
            "id": "private-seller-a27",
            "text": "Sell with tenancy or vacant possession",
            "cell": "A27"
          }
        ]
      },
      {
        "id": "private-seller-a29",
        "title": "Buyer Eligibility Check",
        "items": [
          {
            "id": "private-seller-a30",
            "text": "Before issuing OTP, confirm buyer can purchase.",
            "cell": "A30"
          },
          {
            "id": "private-seller-a31",
            "text": "IPA done",
            "cell": "A31"
          },
          {
            "id": "private-seller-a32",
            "text": "Timeline clear",
            "cell": "A32"
          }
        ]
      },
      {
        "id": "private-seller-a34",
        "title": "Timeline",
        "items": [
          {
            "id": "private-seller-a35",
            "text": "To avoid ABSD, purchased OTP must be excercised after sales OTP exercised",
            "cell": "A35"
          },
          {
            "id": "private-seller-a36",
            "text": "If buy HDB, 15 months cooling period required unless above 55 years old buying 4 room or smaller",
            "cell": "A36"
          }
        ]
      },
      {
        "id": "private-seller-a38",
        "title": "Key Handover Checklist",
        "items": [
          {
            "id": "private-seller-a39",
            "text": "Remove furniture",
            "cell": "A39"
          },
          {
            "id": "private-seller-a40",
            "text": "All keys including letterbox and access card",
            "cell": "A40"
          },
          {
            "id": "private-seller-a41",
            "text": "Utility accounts terminated after inspection",
            "cell": "A41"
          }
        ]
      }
    ],
    "title": "Private Sales"
  },
  {
    "id": "private-buyer",
    "name": "Private Buyer",
    "sourceSheet": "Private Buyer",
    "groups": [
      {
        "id": "private-buyer-a3",
        "title": "Buyer Eligibility",
        "items": [
          {
            "id": "private-buyer-a4",
            "text": "Buyer is at least 21 years old",
            "cell": "A4"
          },
          {
            "id": "private-buyer-a5",
            "text": "Check nationality restrictions (for landed properties)",
            "cell": "A5"
          },
          {
            "id": "private-buyer-a6",
            "text": "Singapore Citizen, PR or Foreigners (check ABSD)",
            "cell": "A6"
          }
        ]
      },
      {
        "id": "private-buyer-a8",
        "title": "Occupier & Household Changes",
        "items": [
          {
            "id": "private-buyer-a9",
            "text": "Divorce situations: Need Interim Judgment, Final Judgment, Order of Court",
            "cell": "A9"
          },
          {
            "id": "private-buyer-a10",
            "text": "Deceased owner: Need Probate / Letters of Administration",
            "cell": "A10"
          },
          {
            "id": "private-buyer-a11",
            "text": "Minor owner: Court order required",
            "cell": "A11"
          },
          {
            "id": "private-buyer-a12",
            "text": "Bankruptcy check",
            "cell": "A12"
          },
          {
            "id": "private-buyer-a13",
            "text": "Confirm if property held under company / trust",
            "cell": "A13"
          }
        ]
      },
      {
        "id": "private-buyer-a15",
        "title": "Financial & Loan Matters",
        "items": [
          {
            "id": "private-buyer-a16",
            "text": "Outstanding loan amount",
            "cell": "A16"
          },
          {
            "id": "private-buyer-a17",
            "text": "Lock-in period and redemption penalty (if applicable)",
            "cell": "A17"
          },
          {
            "id": "private-buyer-a18",
            "text": "Notice period for redemption (if applicable)",
            "cell": "A18"
          },
          {
            "id": "private-buyer-a19",
            "text": "CPF refund amount",
            "cell": "A19"
          },
          {
            "id": "private-buyer-a20",
            "text": "If is using CPF (> 55 years old), check CPF board first before issue OTP",
            "cell": "A20"
          }
        ]
      },
      {
        "id": "private-buyer-a22",
        "title": "Property Details",
        "items": [
          {
            "id": "private-buyer-a23",
            "text": "Maintenance fees",
            "cell": "A23"
          },
          {
            "id": "private-buyer-a24",
            "text": "Lease commencement year",
            "cell": "A24"
          },
          {
            "id": "private-buyer-a25",
            "text": "Remaining lease",
            "cell": "A25"
          },
          {
            "id": "private-buyer-a26",
            "text": "Extension required?",
            "cell": "A26"
          },
          {
            "id": "private-buyer-a27",
            "text": "Sell with tenancy or vacant possession",
            "cell": "A27"
          }
        ]
      },
      {
        "id": "private-buyer-a29",
        "title": "Buyer Eligibility Check",
        "items": [
          {
            "id": "private-buyer-a30",
            "text": "Before issuing OTP, confirm buyer can purchase.",
            "cell": "A30"
          },
          {
            "id": "private-buyer-a31",
            "text": "IPA done",
            "cell": "A31"
          },
          {
            "id": "private-buyer-a32",
            "text": "Timeline clear",
            "cell": "A32"
          }
        ]
      },
      {
        "id": "private-buyer-a34",
        "title": "Timeline",
        "items": [
          {
            "id": "private-buyer-a35",
            "text": "To avoid ABSD, purchased OTP must be excercised after sales OTP exercised",
            "cell": "A35"
          }
        ]
      },
      {
        "id": "private-buyer-a38",
        "title": "Key Handover Checklist",
        "items": [
          {
            "id": "private-buyer-a39",
            "text": "Remove furniture",
            "cell": "A39"
          },
          {
            "id": "private-buyer-a40",
            "text": "All keys including letterbox and access card",
            "cell": "A40"
          },
          {
            "id": "private-buyer-a41",
            "text": "Utility accounts terminated after inspection",
            "cell": "A41"
          }
        ]
      }
    ],
    "title": "Private Purchase"
  }
];
  if(typeof module!=="undefined"&&module.exports)module.exports=sheets;
  else root.EstateChecklistData=sheets;
})(globalThis);
