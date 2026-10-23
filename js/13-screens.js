const Screens = (() => {
  const help = document.getElementById('help');
  const helpToggle = document.getElementById('helpToggle');
  const fade = document.getElementById('fade');
  const faintBox = document.getElementById('faint');
  let sleeping = false, fainted = false;

  function setHelp(on) {
    help.classList.toggle('open', on);
    helpToggle.textContent = on ? 'H: hide controls' : 'H: show controls';
  }
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyH' && !e.repeat) setHelp(!help.classList.contains('open'));
    if ((e.code === 'Enter' || e.code === 'Space') && fainted) { e.preventDefault(); wake(); }
  });

  // Sleep: the screen slowly goes dark, the night passes, then it slowly comes back.
  function sleep() {
    sleeping = true;
    fade.classList.add('on');
    setTimeout(() => {
      Time.sleepToMorning();
      World.growCrops(CONFIG.time.nightLength);   // your garlic grows while you sleep
      Save.write();
      fade.classList.remove('on');
      setTimeout(() => { sleeping = false; Hotbar.say(`Good morning! Day ${Time.day()}.`); }, 1200);
    }, 1800);
  }

  function faint(text) {
    if (fainted) return;
    fainted = true;
    document.getElementById('faintText').textContent = text + ' You keep all your items.';
    faintBox.classList.add('open');
  }
  function wake() {
    if (!fainted) return;
    fainted = false;
    faintBox.classList.remove('open');
    Mechanics.wakeUp();
    Animals.calmAll();
    Hotbar.say('Eat some food soon: choose it and hold R.');
  }
  document.getElementById('wakeUp').addEventListener('click', wake);

  // New world: ask once more before starting over.
  const area = document.getElementById('newWorldArea');
  area.addEventListener('click', e => {
    if (e.target.id === 'newWorld') {
      area.innerHTML = 'Start over? Your items will be gone.<br><button id="yesNew" class="danger">Yes, new world</button> <button id="noNew">No, keep playing</button>';
    } else if (e.target.id === 'yesNew') {
      Save.newWorld();
    } else if (e.target.id === 'noNew') {
      area.innerHTML = '<button id="newWorld" class="danger">Start a new world</button>';
    }
  });

  // Peaceful setting: no animal attacks. Remembered in this browser.
  const settingsKey = CONFIG.save.key + '-settings';
  let peaceful = false;
  try { peaceful = JSON.parse(localStorage.getItem(settingsKey) || '{}').peaceful === true; } catch (e) {}
  const peaceBtn = document.getElementById('peaceful');
  function showPeace() {
    peaceBtn.textContent = peaceful ? 'Peaceful: ON (animals do not attack)' : 'Peaceful: OFF (wolves, bears and night creatures attack)';
  }
  peaceBtn.addEventListener('click', () => {
    peaceful = !peaceful;
    try { localStorage.setItem(settingsKey, JSON.stringify({ peaceful })); } catch (e) {}
    showPeace();
    Hotbar.say(peaceful ? 'Peaceful is on. Animals will not attack.' : 'Peaceful is off. Watch out for wolves and bears.');
  });
  showPeace();

  // A calm pop-up message with an OK button (Enter, Esc or a click closes it).
  const noticeBox = document.getElementById('notice');
  let noticeOpen = false;
  function notice(text) {
    document.getElementById('noticeText').textContent = text;
    noticeBox.classList.add('open');
    noticeOpen = true;
    Mechanics.clearKeys();
  }
  function closeNotice() { noticeBox.classList.remove('open'); noticeOpen = false; Mechanics.clearKeys(); }
  document.getElementById('noticeOk').addEventListener('click', closeNotice);
  window.addEventListener('keydown', e => {
    if (noticeOpen && ['Enter', 'Escape', 'Space'].includes(e.code)) { e.preventDefault(); closeNotice(); }
  });

  return { sleep, faint, setHelp, notice, peaceful: () => peaceful,
           busy: () => sleeping || fainted || noticeOpen || Tent.isOpen() };
})();
