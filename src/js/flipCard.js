/**
 * 3D Flip Card DOM Manager
 * Handles split-card mechanical flip animations, dynamic singular/plural label updates,
 * automatic unit hiding, and single-digit card morphing (fading left '0' and expanding right card).
 */

const SINGULAR_LABELS = {
  years: 'Year',
  months: 'Month',
  days: 'Day',
  hours: 'Hour',
  minutes: 'Minute',
  seconds: 'Second'
};

const PLURAL_LABELS = {
  years: 'Years',
  months: 'Months',
  days: 'Days',
  hours: 'Hours',
  minutes: 'Minutes',
  seconds: 'Seconds'
};

export class FlipClockManager {
  constructor(containerElement, playAudioCallback = null) {
    this.container = containerElement;
    this.playAudio = playAudioCallback;
    this.previousState = {};
    this.showLeadingZeros = true;
  }

  setOptions({ showLeadingZeros }) {
    this.showLeadingZeros = showLeadingZeros;
  }

  /**
   * Update clock with new values
   * @param {Object} timeData - { years, months, days, hours, minutes, seconds, isPast, isComplete }
   */
  update(timeData) {
    const units = ['years', 'months', 'days', 'hours', 'minutes', 'seconds'];
    let anyFlipped = false;

    // Check if entire countdown is down to the final seconds (all higher units are 0)
    const isFinalSeconds = (
      timeData.years === 0 &&
      timeData.months === 0 &&
      timeData.days === 0 &&
      timeData.hours === 0 &&
      timeData.minutes === 0
    );

    let isLeadingZero = true;
    const hideLeadingUnits = !timeData.isPast && !timeData.isComplete;

    units.forEach((unit) => {
      const val = timeData[unit];
      const prevVal = this.previousState[unit];
      const unitCardElem = this.container.querySelector(`[data-unit="${unit}"]`);

      if (!unitCardElem) return;

      // Handle visibility for leading zero units
      if (unit !== 'seconds') {
        if (!this.showLeadingZeros && isLeadingZero && val === 0) {
          unitCardElem.classList.add('unit-hidden');
        } else {
          if (val > 0) isLeadingZero = false;
          unitCardElem.classList.remove('unit-hidden');
        }
      } else {
        // Seconds unit card: always visible so clock is never an empty row
        unitCardElem.classList.remove('unit-hidden');
      }

      const flipClockUnit = unitCardElem.querySelector('.flip-clock-unit');
      const labelElem = unitCardElem.querySelector('.unit-label');

      // Determine single-digit morph mode:
      // For years, months, days, hours, minutes: single-digit mode whenever val < 10
      // For seconds: single-digit mode during final countdown (isFinalSeconds && val <= 9)
      // and whenever the countdown has ended/completed (timeData.isComplete / isPast),
      // ensuring it displays a single '0' instead of splitting into two zeros ('00').
      let isSingleDigit = false;
      if (unit !== 'seconds') {
        isSingleDigit = (val < 10);
      } else {
        isSingleDigit = (isFinalSeconds && val <= 9) || timeData.isComplete || timeData.isPast;
      }

      // Ensure 2 card elements exist (leftCard and rightCard) inside flipClockUnit
      this.ensureTwoCards(flipClockUnit);

      // Toggle single-digit CSS class on flipClockUnit
      if (isSingleDigit) {
        flipClockUnit.classList.add('single-digit');
      } else {
        flipClockUnit.classList.remove('single-digit');
      }

      // Format digits for left ('0') and right cards
      const tensDigit = String(Math.floor(val / 10));
      const onesDigit = String(val % 10);

      const cards = flipClockUnit.querySelectorAll('.flip-card');
      const leftCard = cards[0];
      const rightCard = cards[1];

      // Animate card digit updates if values changed
      let flippedInUnit = false;
      if (leftCard.dataset.digit !== tensDigit) {
        this.animateFlip(leftCard, leftCard.dataset.digit || '0', tensDigit);
        leftCard.dataset.digit = tensDigit;
        flippedInUnit = true;
      }
      if (rightCard.dataset.digit !== onesDigit) {
        this.animateFlip(rightCard, rightCard.dataset.digit || '0', onesDigit);
        rightCard.dataset.digit = onesDigit;
        flippedInUnit = true;
      }

      if (flippedInUnit) anyFlipped = true;

      // Update Singular/Plural Label
      const isSingular = (val === 1);
      this.updateUnitLabel(labelElem, unit, isSingular);

      this.previousState[unit] = val;
    });

    if (anyFlipped && this.playAudio) {
      this.playAudio();
    }
  }

  /**
   * Ensure exactly 2 cards (left-card and right-card) exist in container
   */
  ensureTwoCards(container) {
    let cards = container.querySelectorAll('.flip-card');
    if (cards.length !== 2) {
      container.innerHTML = '';
      const leftCard = this.createCardElement('0', 'left-card');
      const rightCard = this.createCardElement('0', 'right-card');
      container.appendChild(leftCard);
      container.appendChild(rightCard);
    }
  }

  createCardElement(digit, extraClass = '') {
    const card = document.createElement('div');
    card.className = `flip-card ${extraClass}`;
    card.dataset.digit = digit;

    card.innerHTML = `
      <div class="card-top"><span class="digit-num">${digit}</span></div>
      <div class="card-bottom"><span class="digit-num">${digit}</span></div>
      <div class="flip-leaf-top"><span class="digit-num">${digit}</span></div>
      <div class="flip-leaf-bottom"><span class="digit-num">${digit}</span></div>
    `;

    return card;
  }

  /**
   * Smooth 3D Flip Animation Logic
   */
  animateFlip(card, oldVal, newVal) {
    const cardTop = card.querySelector('.card-top .digit-num');
    const cardBottom = card.querySelector('.card-bottom .digit-num');
    const leafTop = card.querySelector('.flip-leaf-top .digit-num');
    const leafBottom = card.querySelector('.flip-leaf-bottom .digit-num');

    cardTop.textContent = newVal;
    cardBottom.textContent = oldVal;
    leafTop.textContent = oldVal;
    leafBottom.textContent = newVal;

    card.classList.remove('flipping');
    void card.offsetWidth; // Force CSS reflow
    card.classList.add('flipping');

    if (card._flipTimer) clearTimeout(card._flipTimer);

    card._flipTimer = setTimeout(() => {
      cardBottom.textContent = newVal;
      leafTop.textContent = newVal;
      card.classList.remove('flipping');
    }, 480);
  }

  /**
   * Update label between singular and plural
   */
  updateUnitLabel(labelElem, unit, isSingular) {
    if (!labelElem) return;

    const targetLabelText = isSingular ? SINGULAR_LABELS[unit] : PLURAL_LABELS[unit];
    const textSpan = labelElem.querySelector('.label-text');

    if (textSpan && textSpan.textContent !== targetLabelText) {
      labelElem.classList.add('animating');
      setTimeout(() => {
        textSpan.textContent = targetLabelText;
        if (isSingular) {
          labelElem.classList.add('label-singular');
        } else {
          labelElem.classList.remove('label-singular');
        }
        labelElem.classList.remove('animating');
      }, 150);
    }
  }
}
