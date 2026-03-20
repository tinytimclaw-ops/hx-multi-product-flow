// Holiday Extras Multi-Product Hashed Flow

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
  flight: 'default'
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Check hash on load
  const hash = window.location.hash.slice(1);
  if (hash && document.getElementById(`screen-${hash}`)) {
    navigateToStep(hash, false);
  }

  // Set up product selection
  document.querySelectorAll('#screen-product .option-card').forEach(btn => {
    btn.addEventListener('click', () => {
      state.product = btn.dataset.value;
      const next = btn.dataset.next;
      navigateToStep(next);
    });
  });

  // Set up airport selection
  document.querySelectorAll('#screen-airport .option-item').forEach(btn => {
    btn.addEventListener('click', () => {
      state.airport = btn.dataset.value;
      generateDateScroller('outDateScroller', 'outdate');
      navigateToStep('outdate');
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
      // Update flight screen back button to point to roomtype
      document.getElementById('flightBackBtn').dataset.back = 'roomtype';
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
  }, isBack ? 0 : 150);
}

// Generate date scroller
function generateDateScroller(scrollerId, nextStep) {
  const scroller = document.getElementById(scrollerId);
  scroller.innerHTML = '';

  const today = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Generate 90 days
  for (let i = 0; i < 90; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const dateStr = date.toISOString().split('T')[0];
    const dayName = days[date.getDay()];
    const dayNum = date.getDate();
    const monthName = months[date.getMonth()];

    const item = document.createElement('button');
    item.className = 'date-item';
    item.dataset.value = dateStr;
    item.innerHTML = `
      <div class="date-day">${dayName}</div>
      <div class="date-full">${dayNum} ${monthName}</div>
    `;

    item.addEventListener('click', () => {
      if (nextStep === 'outdate') {
        state.outDate = dateStr;
        generateTimeScroller('outTimeScroller', 'outtime');
        navigateToStep('outtime');
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

  // Generate times from 00:00 to 23:30 in 30min intervals
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour = h.toString().padStart(2, '0');
      const min = m.toString().padStart(2, '0');
      const timeValue = `${hour}:${min}`;
      const timeEncoded = `${hour}%3A${min}`;

      const item = document.createElement('button');
      item.className = 'time-item';
      item.dataset.value = timeEncoded;
      item.innerHTML = `<div class="time-value">${timeValue}</div>`;

      item.addEventListener('click', () => {
        if (nextStep === 'outtime') {
          state.outTime = timeEncoded;
          generateDateScroller('inDateScroller', 'indate');
          navigateToStep('indate');
        } else if (nextStep === 'intime') {
          state.inTime = timeEncoded;
          // Check if product needs room type selection
          if (state.product === 'hotel' || state.product === 'hotel-parking') {
            navigateToStep('roomtype');
          } else {
            // Update flight screen back button to point to intime for parking/lounge
            document.getElementById('flightBackBtn').dataset.back = 'intime';
            // Load destinations for flight lookup
            fetchDestinations(state.airport, state.outDate);
            navigateToStep('flight');
          }
        }
      });

      scroller.appendChild(item);
    }
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
      flights.forEach(f => {
        const code = (f.flight && f.flight.code) || '';
        const depTime = (f.departure && f.departure.time) || '';
        const stops = (f.flight && f.flight.connectingFlights && f.flight.connectingFlights.amount) || 0;
        const stopsText = stops === 0 ? 'Direct' : `${stops} stop${stops > 1 ? 's' : ''}`;

        const option = document.createElement('option');
        option.value = code;
        option.textContent = `${code} - ${depTime} (${stopsText})`;
        select.appendChild(option);
      });
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
  const { product, airport, outDate, outTime, inDate, inTime, roomType, flight } = state;

  if (!product || !airport || !outDate || !outTime || !inDate || !inTime) {
    alert('Please complete all fields');
    return;
  }

  const host = window.location.host;
  const isLocal = host.startsWith('127') || host.includes('github.io');
  const basedomain = isLocal ? 'www.holidayextras.com' : host;

  // Build search URL
  let searchUrl;
  if (product === 'parking') {
    searchUrl = `https://${basedomain}/static/?selectProduct=cp&#/categories?agent=WY992&ppts=&customer_ref=&lang=en&adults=2&depart=${airport}&terminal=&arrive=&flight=${flight}&in=${inDate}&out=${outDate}&park_from=${outTime}&park_to=${inTime}&filter_meetandgreet=&filter_parkandride=&children=0&infants=0&redirectReferal=carpark&from_categories=true&adcode=&promotionCode=`;
  } else if (product === 'hotel-parking') {
    // Hotel+Parking uses stayDate (outDate-1), out=outDate, in=inDate, room_1=roomType
    searchUrl = `https://${basedomain}/static/?selectProduct=hcp&#/hotel_with_parking?agent=WY992&ppts=0&customer_ref=&lang=en&depart=${airport}&terminal=&arrive=&flight=${flight}&in=${inDate}&out=${outDate}&stay=${outDate}&room_1=${roomType}&room_2=&adcode=&promotionCode=`;
  } else if (product === 'hotel') {
    // Hotel-only uses stay=inDate, out=inDate+1 day
    const checkOutDate = new Date(inDate);
    checkOutDate.setDate(checkOutDate.getDate() + 1);
    const outDateFormatted = checkOutDate.toISOString().split('T')[0];
    searchUrl = `https://${basedomain}/static/?selectProduct=ho&#/hotel?agent=WY992&ppts=&customer_ref=&lang=en&depart=${airport}&terminal=&arrive=&flight=${flight}&out=${outDateFormatted}&stay=${inDate}&room_1=${roomType}&room_2=&adcode=&promotionCode=`;
  } else if (product === 'lounge') {
    searchUrl = `https://${basedomain}/static/?selectProduct=al&#/categories?agent=WY992&ppts=&customer_ref=&lang=en&adults=2&depart=${airport}&arrive=&flight=${flight}&in=${outDate}&out=${outDate}&filter_breakfast=&children=0&infants=0&from_categories=true&adcode=&promotionCode=`;
  }

  window.location.href = searchUrl;
}
