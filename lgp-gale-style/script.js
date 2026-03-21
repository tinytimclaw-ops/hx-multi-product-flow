// LGP Parking Page - Gale Glazing Style

// Airport name lookup
const AIRPORT_NAMES = {
  LHR: "Heathrow", LGW: "Gatwick", MAN: "Manchester", STN: "Stansted",
  LTN: "Luton", BHX: "Birmingham", EDI: "Edinburgh", BRS: "Bristol",
  NCL: "Newcastle", LBA: "Leeds Bradford", EMA: "East Midlands",
  LPL: "Liverpool", GLA: "Glasgow", EXT: "Exeter", LCY: "London City"
};
const DEFAULT_AIRPORT = "Airport";

// Date helper
function datePlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function defaultInFromOut(outDateStr) {
  const d = new Date(outDateStr);
  d.setDate(d.getDate() + 8);
  return d.toISOString().split("T")[0];
}

// State
let manualInDateChange = false;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  // Get URL params
  const urlParams = new URLSearchParams(window.location.search);
  const locationParam = (urlParams.get("Location") || urlParams.get("location") || "").toUpperCase();
  const agentParam = urlParams.get("agent") || "";
  const flightParam = urlParams.get("flight") || "default";
  const adcodeParam = urlParams.get("adcode") || "";
  const promotionCodeParam = urlParams.get("promotionCode") || "";

  // Store params for later use
  window.searchParams = {
    agent: agentParam || "WY992",
    flight: flightParam,
    adcode: adcodeParam,
    promotionCode: promotionCodeParam
  };

  // Resolve airport
  let depart = locationParam;
  const airportName = AIRPORT_NAMES[depart] || DEFAULT_AIRPORT;

  // Update page title and headings
  document.title = `${airportName} Parking`;
  document.getElementById('bannerHeadline').textContent = `Save up to 60% on ${airportName} parking`;
  document.getElementById('searchCardTitle').textContent = `Search ${airportName} parking`;

  // Handle airport field visibility
  const airportField = document.getElementById('airportField');
  const airportSelect = document.getElementById('airportSelect');

  if (depart && AIRPORT_NAMES[depart]) {
    // Valid airport in URL - hide the select
    airportField.style.display = 'none';
    airportSelect.value = depart;
  } else {
    // No valid airport - show the select
    airportField.style.display = 'flex';
    depart = "LGW"; // Default to Gatwick
    airportSelect.value = depart;
  }

  window.searchParams.depart = depart;

  // Pre-fill dates
  const outDateInput = document.getElementById('outDate');
  const inDateInput = document.getElementById('inDate');

  outDateInput.value = datePlus(1); // Tomorrow
  inDateInput.value = datePlus(9); // 8 days after tomorrow

  // Track manual inDate changes
  inDateInput.addEventListener('change', () => {
    manualInDateChange = true;
  });

  // Recalculate inDate when outDate changes (unless user manually changed it)
  outDateInput.addEventListener('change', () => {
    if (!manualInDateChange) {
      inDateInput.value = defaultInFromOut(outDateInput.value);
    }
  });

  // Update depart when airport select changes
  airportSelect.addEventListener('change', () => {
    window.searchParams.depart = airportSelect.value;
  });

  // Form submission
  document.getElementById('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const outDate = outDateInput.value;
    const outTime = document.getElementById('outTime').value;
    const inDate = inDateInput.value;
    const inTime = document.getElementById('inTime').value;

    // Build search URL
    const host = window.location.host;
    const isLocal = host.startsWith("127") || host.includes("github.io");
    const basedomain = isLocal ? "www.holidayextras.com" : host.replace("www", "app");

    const { agent, depart, flight, adcode, promotionCode } = window.searchParams;

    const searchUrl = `https://${basedomain}/static/?selectProduct=cp&#/categories?agent=${agent}&ppts=&customer_ref=&lang=en&adults=2&depart=${depart}&terminal=&arrive=&flight=${flight}&in=${inDate}&out=${outDate}&park_from=${outTime}&park_to=${inTime}&filter_meetandgreet=&filter_parkandride=&children=0&infants=0&redirectReferal=carpark&from_categories=true&adcode=${adcode}&promotionCode=${promotionCode}`;

    window.location.href = searchUrl;
  });
});
