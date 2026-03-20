// Holiday Extras Multi-Product Hashed Flow
// Version: 2026-03-20-20:40 - Fixed product selection null checks

const FLIGHT_API = "https://flight.dock-yard.io";

// State
const state = {
  product: null,
  airport: null,
  outDate: null,
  outTime: null,
  inDate: null,
  inTime: null,
  roomType: 'D20',
  roomType2: '',
  adults: 2,
  children: 0,
  infants: 0,
  flight: 'default'
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Check for URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const locationParam = urlParams.get('Location') || urlParams.get('location');
  const productParam = urlParams.get('Product') || urlParams.get('product');

  // Valid UK airport codes
  const validAirports = ['LHR', 'LGW', 'MAN', 'STN', 'LTN', 'BHX', 'EDI', 'BRS', 'NCL', 'LBA', 'EMA', 'LPL', 'GLA', 'EXT', 'LCY'];

  // Map product codes to product values
  const productMap = {
    'cp': 'parking',
    'hcp': 'hotel-parking',
    'ho': 'hotel',
    'lo': 'lounge',
    'ti': 'insurance',
    'ot': 'transfers',
    'ch': 'carhire',
    'ft': 'fasttrack'
  };

  // Set airport if valid
  if (locationParam && validAirports.includes(locationParam.toUpperCase())) {
    state.airport = locationParam.toUpperCase();
  }

  // Set product if valid
  if (productParam && productMap[productParam.toLowerCase()]) {
    state.product = productMap[productParam.toLowerCase()];
    updateTitlesForProduct(state.product);
  }

  // Check hash on load
  const hash = window.location.hash.slice(1);
  if (hash && document.getElementById(`screen-${hash}`)) {
    navigateToStep(hash, false);
  } else if (state.product && state.airport) {
    // Both product and airport are set - skip to date selection
    generateDateScroller('outDateScroller', 'outdate');
    navigateToStep('outdate');
  } else if (state.product) {
    // Product is set - skip to airport selection
    navigateToStep('airport');
  } else if (state.airport) {
    // Airport is set - show product selection (default behavior)
    // navigateToStep('product') is implicit as it's the first screen
  }

  // Set up product selection
  document.querySelectorAll('#screen-product .option-card').forEach(btn => {
    btn.addEventListener('click', () => {
      state.product = btn.dataset.value;
      const next = btn.dataset.next;

      // Update titles based on product
      updateTitlesForProduct(state.product);

      // Skip airport screen if Location param is valid
      if (state.airport && next === 'airport') {
        generateDateScroller('outDateScroller', 'outdate');
        navigateToStep('outdate');
      } else {
        navigateToStep(next);
      }
    });
  });

  // Set up airport selection
  document.querySelectorAll('#screen-airport .option-item').forEach(btn => {
    btn.addEventListener('click', () => {
      state.airport = btn.dataset.value;
      // Insurance, transfers, car hire, and fast track don't need dates - submit immediately
      if (state.product === 'insurance' || state.product === 'transfers' || state.product === 'carhire' || state.product === 'fasttrack') {
        submitSearch();
      } else {
        generateDateScroller('outDateScroller', 'outdate');
        navigateToStep('outdate');
      }
    });
  });

  // Set up back buttons
  document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.back;
      navigateToStep(target, true);
    });
  });

  // Set up skip button
  document.querySelector('.skip-btn').addEventListener('click', () => {
    submitSearch();
  });

  // Set up submit button
  document.getElementById('submitBtn').addEventListener('click', () => {
    submitSearch();
  });

  // Set up destination select
  document.getElementById('destinationSelect').addEventListener('change', function() {
    if (this.value) {
      fetchFlights(state.airport, state.outDate, this.value);
    }
  });

  // Set up flight select
  document.getElementById('flightSelect').addEventListener('change', function() {
    state.flight = this.value || 'default';
  });

  // Set up room type selection
  document.querySelectorAll('#screen-roomtype .option-item').forEach(btn => {
    btn.addEventListener('click', () => {
      state.roomType = btn.dataset.value;
      // Go to second room type selection
      navigateToStep('roomtype2');
    });
  });

  // Set up second room type selection
  document.querySelectorAll('#screen-roomtype2 .option-item').forEach(btn => {
    btn.addEventListener('click', () => {
      state.roomType2 = btn.dataset.value;
      // Update flight screen back button to point to roomtype2
      document.getElementById('flightBackBtn').dataset.back = 'roomtype2';
      // Load destinations for flight lookup
      fetchDestinations(state.airport, state.outDate);
      navigateToStep('flight');
    });
  });

  // Set up no thanks button
  document.getElementById('noThanksBtn').addEventListener('click', () => {
    state.roomType2 = '';
    // Update flight screen back button to point to roomtype2
    document.getElementById('flightBackBtn').dataset.back = 'roomtype2';
    // Load destinations for flight lookup
    fetchDestinations(state.airport, state.outDate);
    navigateToStep('flight');
  });

  // Set up passenger selection
  document.querySelectorAll('#screen-passengers .option-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const [adults, children, infants] = btn.dataset.value.split(',').map(Number);
      state.adults = adults;
      state.children = children;
      state.infants = infants;
      // Update flight screen back button to point to passengers
      document.getElementById('flightBackBtn').dataset.back = 'passengers';
      // Load destinations for flight lookup
      fetchDestinations(state.airport, state.outDate);
      navigateToStep('flight');
    });
  });

  // Handle browser back/forward
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      navigateToStep(hash, false);
    }
  });
});

// Update titles based on product
function updateTitlesForProduct(product) {
  const outDateTitle = document.getElementById('outDateTitle');
  const outDateSubtitle = document.getElementById('outDateSubtitle');
  const inDateTitle = document.getElementById('inDateTitle');
  const inDateSubtitle = document.getElementById('inDateSubtitle');
  const inDateBackBtn = document.getElementById('inDateBackBtn');

  // Elements may not exist yet - null check
  if (!outDateTitle) return;

  if (product === 'hotel' || product === 'hotel-parking') {
    outDateTitle.textContent = 'When are you staying?';
    outDateSubtitle.textContent = 'Select your check-in date';
    if (inDateTitle) inDateTitle.textContent = 'When are you leaving?';
    if (inDateSubtitle) inDateSubtitle.textContent = 'Select your check-out date';
    if (inDateBackBtn) inDateBackBtn.dataset.back = 'outdate'; // Hotel skips outtime, back goes to outdate
  } else if (product === 'lounge') {
    outDateTitle.textContent = 'When are you flying?';
    outDateSubtitle.textContent = 'Select your departure date';
  } else {
    // Parking
    outDateTitle.textContent = 'When are you going?';
    outDateSubtitle.textContent = 'Select your drop-off date';
    if (inDateTitle) inDateTitle.textContent = 'When are you back?';
    if (inDateSubtitle) inDateSubtitle.textContent = 'Select your collection date';
    if (inDateBackBtn) inDateBackBtn.dataset.back = 'outtime';
  }
}

// Mark selected items when returning to a screen
function markSelectedItems(step) {
  if (step === 'roomtype' && state.roomType) {
    document.querySelectorAll('#screen-roomtype .option-item').forEach(btn => {
      if (btn.dataset.value === state.roomType) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  } else if (step === 'passengers' && state.adults) {
    const passValue = `${state.adults},${state.children},${state.infants}`;
    document.querySelectorAll('#screen-passengers .option-item').forEach(btn => {
      if (btn.dataset.value === passValue) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  } else if (step === 'airport' && state.airport) {
    document.querySelectorAll('#screen-airport .option-item').forEach(btn => {
      if (btn.dataset.value === state.airport) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  }
}

// Navigation
function navigateToStep(step, isBack = false) {
  const currentScreen = document.querySelector('.screen:not([style*="display: none"])');
  const nextScreen = document.getElementById(`screen-${step}`);

  if (!nextScreen) return;

  // Hide current, show next
  if (currentScreen && currentScreen !== nextScreen) {
    currentScreen.classList.add(isBack ? 'slide-out-right' : 'slide-out-left');
    setTimeout(() => {
      currentScreen.style.display = 'none';
      currentScreen.classList.remove('slide-out-left', 'slide-out-right');
    }, 300);
  }

  setTimeout(() => {
    nextScreen.style.display = 'block';
    window.location.hash = step;
    // Mark previously selected items
    markSelectedItems(step);
  }, isBack ? 0 : 150);
}

// Generate date scroller
function generateDateScroller(scrollerId, nextStep) {
  const scroller = document.getElementById(scrollerId);
  scroller.innerHTML = '';

  const today = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Determine which date is already selected
  const selectedDate = nextStep === 'outdate' ? state.outDate : state.inDate;

  // For return dates, determine minimum date (outDate + 1 day)
  let minDate = null;
  if (nextStep === 'indate' && state.outDate) {
    minDate = new Date(state.outDate);
    minDate.setDate(minDate.getDate() + 1); // Return date must be at least 1 day after outDate
  }

  // Generate 365 days
  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    // Skip dates before minimum date for return dates
    if (minDate && date < minDate) {
      continue;
    }

    const dateStr = date.toISOString().split('T')[0];
    const dayName = days[date.getDay()];
    const dayNum = date.getDate();
    const monthName = months[date.getMonth()];

    const item = document.createElement('button');
    item.className = 'date-item';
    if (dateStr === selectedDate) {
      item.classList.add('selected');
    }
    item.dataset.value = dateStr;
    item.innerHTML = `
      <div class="date-day">${dayName}</div>
      <div class="date-full">${dayNum} ${monthName}</div>
    `;

    item.addEventListener('click', () => {
      if (nextStep === 'outdate') {
        state.outDate = dateStr;
        // Hotel-only doesn't need drop-off time or return date - go straight to room type
        if (state.product === 'hotel') {
          // Update roomtype back button to point to outdate
          document.getElementById('roomTypeBackBtn').dataset.back = 'outdate';
          navigateToStep('roomtype');
        }
        // Hotel+parking doesn't need drop-off time - skip straight to return date
        else if (state.product === 'hotel-parking') {
          generateDateScroller('inDateScroller', 'indate');
          navigateToStep('indate');
        } else {
          generateTimeScroller('outTimeScroller', 'outtime');
          navigateToStep('outtime');
        }
      } else if (nextStep === 'indate') {
        state.inDate = dateStr;
        generateTimeScroller('inTimeScroller', 'intime');
        navigateToStep('intime');
      }
    });

    scroller.appendChild(item);
  }
}

// Generate time scroller
function generateTimeScroller(scrollerId, nextStep) {
  const scroller = document.getElementById(scrollerId);
  scroller.innerHTML = '';

  // Check if we're selecting time for today
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const selectedDate = nextStep === 'outtime' ? state.outDate : state.inDate;
  const isToday = selectedDate === today;

  // Determine which time is already selected
  const selectedTime = nextStep === 'outtime' ? state.outTime : state.inTime;

  // Generate times from 00:00 to 23:00 in hourly intervals
  for (let h = 0; h < 24; h++) {
    // Skip past times if today is selected
    if (isToday && nextStep === 'outtime') {
      if (h <= currentHour) {
        continue;
      }
    }

    const hour = h.toString().padStart(2, '0');
    const timeValue = `${hour}:00`;
    const timeEncoded = `${hour}%3A00`;

      const item = document.createElement('button');
      item.className = 'time-item';
      if (timeEncoded === selectedTime) {
        item.classList.add('selected');
      }
      item.dataset.value = timeEncoded;
      item.innerHTML = `<div class="time-value">${timeValue}</div>`;

      item.addEventListener('click', () => {
        if (nextStep === 'outtime') {
          state.outTime = timeEncoded;
          // Lounge only needs departure date/time - skip return dates
          if (state.product === 'lounge') {
            navigateToStep('passengers');
          } else {
            generateDateScroller('inDateScroller', 'indate');
            navigateToStep('indate');
          }
        } else if (nextStep === 'intime') {
          state.inTime = timeEncoded;
          // Check if product needs room type selection
          if (state.product === 'hotel-parking') {
            // Update roomtype back button to point to intime for hotel+parking
            document.getElementById('roomTypeBackBtn').dataset.back = 'intime';
            navigateToStep('roomtype');
          } else {
            // Parking - update flight screen back button to point to intime
            document.getElementById('flightBackBtn').dataset.back = 'intime';
            // Load destinations for flight lookup
            fetchDestinations(state.airport, state.outDate);
            navigateToStep('flight');
          }
        }
      });

    scroller.appendChild(item);
  }

  // Auto-scroll to midday (12:00)
  setTimeout(() => {
    const middayItem = scroller.querySelector('[data-value="12%3A00"]');
    if (middayItem) {
      middayItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 300);
}

// Fetch destinations
async function fetchDestinations(depart, departDate) {
  const select = document.getElementById('destinationSelect');

  try {
    const response = await fetch(
      `${FLIGHT_API}/destinations?location=${depart}&departDate=${departDate}`
    );

    if (!response.ok) return;

    const destinations = await response.json();

    if (destinations && destinations.length > 0) {
      destinations.forEach(dest => {
        const option = document.createElement('option');
        option.value = dest.airports.join(',');
        option.textContent = `${dest.city}, ${dest.country}`;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error fetching destinations:', error);
  }
}

// Fetch flights
async function fetchFlights(depart, departDate, destination) {
  const select = document.getElementById('flightSelect');
  select.style.display = 'block';
  select.innerHTML = '<option value="">Loading flights...</option>';

  try {
    const response = await fetch(
      `${FLIGHT_API}/searchDayFlights?location=${depart}&departDate=${departDate}&destination=${destination}&fullResults=false`
    );

    if (!response.ok) {
      select.innerHTML = '<option value="">No flights found</option>';
      return;
    }

    const flights = await response.json();
    select.innerHTML = '<option value="">Select your flight...</option>';

    if (flights && flights.length > 0) {
      // Calculate minimum flight time (2 hours after outTime)
      let minFlightTime = null;
      if (state.outTime) {
        const outTimeDecoded = state.outTime.replace('%3A', ':');
        const [outHour, outMin] = outTimeDecoded.split(':').map(Number);
        const outMinutes = outHour * 60 + outMin;
        const minMinutes = outMinutes + 120; // 2 hours later
        minFlightTime = `${String(Math.floor(minMinutes / 60)).padStart(2, '0')}:${String(minMinutes % 60).padStart(2, '0')}`;
      }

      let filteredCount = 0;
      flights.forEach(f => {
        const code = (f.flight && f.flight.code) || '';
        const depTime = (f.departure && f.departure.time) || '';
        const stops = (f.flight && f.flight.connectingFlights && f.flight.connectingFlights.amount) || 0;
        const stopsText = stops === 0 ? 'Direct' : `${stops} stop${stops > 1 ? 's' : ''}`;

        // Filter out flights before 2 hours after outTime
        if (minFlightTime && depTime && depTime < minFlightTime) {
          return; // Skip this flight
        }

        filteredCount++;
        const option = document.createElement('option');
        option.value = code;
        option.textContent = `${code} - ${depTime} (${stopsText})`;
        select.appendChild(option);
      });

      if (filteredCount === 0) {
        select.innerHTML = '<option value="">No flights found (2+ hours after drop-off)</option>';
      }
    } else {
      select.innerHTML = '<option value="">No flights found</option>';
    }
  } catch (error) {
    console.error('Error fetching flights:', error);
    select.innerHTML = '<option value="">Error loading flights</option>';
  }
}

// Submit search
function submitSearch() {
  const { product, airport, outDate, outTime, inDate, inTime, roomType, roomType2, adults, children, infants, flight } = state;

  // Validate required fields based on product type
  if (product === 'insurance' || product === 'transfers' || product === 'carhire' || product === 'fasttrack') {
    // Insurance, transfers, car hire, and fast track only need product and airport
    if (!product || !airport) {
      alert('Please complete all fields');
      return;
    }
  } else if (product === 'lounge') {
    // Lounge only needs departure date/time
    if (!product || !airport || !outDate || !outTime) {
      alert('Please complete all fields');
      return;
    }
  } else if (product === 'hotel') {
    // Hotel-only only needs check-in date (outDate)
    if (!product || !airport || !outDate) {
      alert('Please complete all fields');
      return;
    }
  } else if (product === 'hotel-parking') {
    // Hotel+parking doesn't need outTime (drop-off time)
    if (!product || !airport || !outDate || !inDate || !inTime) {
      alert('Please complete all fields');
      return;
    }
  } else {
    // Parking needs all date/time fields
    if (!product || !airport || !outDate || !outTime || !inDate || !inTime) {
      alert('Please complete all fields');
      return;
    }
  }

  const host = window.location.host;
  const isLocal = host.startsWith('127') || host.includes('github.io');
  const basedomain = isLocal ? 'www.holidayextras.com' : host;

  // Get all URL params to pass through
  const urlParams = new URLSearchParams(window.location.search);
  const allParams = urlParams.toString();

  // Build search URL
  let searchUrl;
  if (product === 'parking') {
    searchUrl = `https://${basedomain}/static/?selectProduct=cp&#/categories?agent=WY992&ppts=&customer_ref=&lang=en&adults=2&depart=${airport}&terminal=&arrive=&flight=${flight}&in=${inDate}&out=${outDate}&park_from=${outTime}&park_to=${inTime}&filter_meetandgreet=&filter_parkandride=&children=0&infants=0&redirectReferal=carpark&from_categories=true&adcode=&promotionCode=`;
  } else if (product === 'hotel-parking') {
    // Hotel+Parking uses stayDate (outDate-1), out=outDate, in=inDate, room_1=roomType, room_2=roomType2
    searchUrl = `https://${basedomain}/static/?selectProduct=hcp&#/hotel_with_parking?agent=WY992&ppts=0&customer_ref=&lang=en&depart=${airport}&terminal=&arrive=&flight=${flight}&in=${inDate}&out=${outDate}&stay=${outDate}&room_1=${roomType}&room_2=${roomType2}&adcode=&promotionCode=`;
  } else if (product === 'hotel') {
    // Hotel-only uses stay=outDate (check-in date), out=outDate+1 day
    const checkOutDate = new Date(outDate);
    checkOutDate.setDate(checkOutDate.getDate() + 1);
    const outDateFormatted = checkOutDate.toISOString().split('T')[0];
    searchUrl = `https://${basedomain}/static/?selectProduct=ho&#/hotel?agent=WY992&ppts=&customer_ref=&lang=en&depart=${airport}&terminal=&arrive=&flight=${flight}&out=${outDateFormatted}&stay=${outDate}&room_1=${roomType}&room_2=${roomType2}&adcode=&promotionCode=`;
  } else if (product === 'lounge') {
    // Lounge uses from={outDate}%20{outTime} format
    searchUrl = `https://${basedomain}/static/?selectProduct=lo&#/lounge?agent=WY992&ppts=&customer_ref=&lang=en&adults=${adults}&children=${children}&infants=${infants}&depart=${airport}&terminal=&arrive=&flight=${flight}&from=${outDate}%20${outTime}&adcode=&promotionCode=`;
  } else if (product === 'insurance') {
    // Travel insurance - pass through all params
    searchUrl = `https://${basedomain}/travel-insurance.html?chosen=ins&${allParams}`;
  } else if (product === 'transfers') {
    // Overseas transfers - pass through all params
    searchUrl = `https://${basedomain}/airport-transfers.html?chosen=transfers&${allParams}`;
  } else if (product === 'carhire') {
    // Car hire - pass through all params
    searchUrl = `https://${basedomain}/car-hire.html?launch_id=ENG&chosen=carhire&${allParams}`;
  } else if (product === 'fasttrack') {
    // Fast track - pass through all params
    searchUrl = `https://${basedomain}/fast-track.html?chosen=fasttrack&${allParams}`;
  }

  window.location.href = searchUrl;
}
