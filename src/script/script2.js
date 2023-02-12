'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class App {
  #workouts = [];
  #mapEvent;
  #map;

  constructor() {
    this._getPosition();

    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggleElevationField);
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
        window.alert('Geolocation is not active for your browser! :-(');
      });
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    this.#map = L.map('map').setView([latitude, longitude], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    this.#map.on('click', this._showForm.bind(this));
  }

  _showForm(mapE) {
    form.classList.remove('hidden');
    this.#mapEvent = mapE;
    inputDistance.focus();
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row ').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row ').classList.toggle('form__row--hidden');
  }

  _validatePositive(...inputs) {
    return inputs.every(input => input > 0);
  }

  _validateNumbers(...inputs) {
    return inputs.every(input => isFinite(input));
  }

  _addPinMap(type, coords) {
    L.marker(coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 30,
          autoClose: false,
          closeOnClick: false,
          className: `${type}-popup`,
        })
      )
      .setPopupContent('Workout')
      .openPopup();
  }

  _newListElement(newWorkout) {
    form.insertAdjacentHTML(
      'afterend',
      `<li class="workout workout--running" data-id="1234567890">
    <h2 class="workout__title">Running on April 14</h2>
    <div class="workout__details">
      <span class="workout__icon">${newWorkout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
      <span class="workout__value">${newWorkout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${newWorkout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${newWorkout.type === 'running' ? newWorkout.calcPace() : newWorkout.calcSpeed()}</span>
      <span class="workout__unit">${newWorkout.type === 'running' ? 'min/km' : 'km/h'}</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">${newWorkout.type === 'running' ? '🦶🏼' : '⛰'}</span>
      <span class="workout__value">${'cadence'}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>`
    );
  }

  _newWorkout(e) {
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const elevation = +inputElevation.value;
    const cadence = +inputCadence.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let createWorkout;
    e.preventDefault();
    if (type === 'running') {
      if (!this._validatePositive(distance, duration, cadence) || !this._validateNumbers(distance, duration, cadence))
        return alert('Please introduce a positive number!');
      createWorkout = new Running([lat, lng], distance, duration, cadence);
      this.#workouts.push(createWorkout);
    }

    if (type === 'cycling') {
      if (!this._validatePositive(distance, duration, elevation) || !this._validateNumbers(distance, duration, elevation))
        return alert('Please introduce a positive number!');
      createWorkout = new Cycling([lat, lng], distance, duration, elevation);
      this.#workouts.push(createWorkout);
    }
    this._newListElement(createWorkout);
    this._addPinMap(type, [lat, lng]);
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
    form.classList.add('hidden');
  }
}

const app = new App();
