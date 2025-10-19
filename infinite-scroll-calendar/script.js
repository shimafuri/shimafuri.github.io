// 祝日データ
let holidays = {};

// 祝日を取得
async function fetchHolidays() {
    try {
        const startYear = 2024;
        const endYear = 2027;

        for (let year = startYear; year <= endYear; year++) {
            const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/JP`);
            if (response.ok) {
                const data = await response.json();
                data.forEach(holiday => {
                    holidays[holiday.date] = holiday.localName;
                });
            }
        }
    } catch (error) {
        console.error('祝日の取得に失敗しました:', error);
    }
}

// デフォルト値の設定
function initializeDefaults() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    document.getElementById('startDate').value = dateStr;
    document.getElementById('dayCount').value = '300';
}

// 日付を取得する関数
function getDateArray(startDate, days) {
    const dates = [];
    const current = new Date(startDate);

    for (let i = 0; i < days; i++) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }

    return dates;
}

// 曜日を取得（0=日曜日）
function getDayOfWeek(date) {
    return date.getDay();
}

// 1段に表示する週数を計算
function getWeeksPerColumn() {
    const wrapper = document.querySelector('.calendar-wrapper');
    const wrapperHeight = wrapper.clientHeight;
    const weekHeight = 32; // 1週の高さ（2rem = 32px）
    const headerHeight = 32; // 曜日ヘッダーの高さ（2rem = 32px）
    const padding = 8; // wrapperのpadding上下（0.25rem * 2 = 8px）
    const scrollbarHeight = 20; // 横スクロールバーの高さ（余裕を持って20px）
    const marginBottom = 32; // 最後の行が見切れないように1行分の余裕

    const availableHeight = wrapperHeight - padding - headerHeight - scrollbarHeight - marginBottom;
    const weeksCount = Math.floor(availableHeight / weekHeight);

    return Math.max(1, weeksCount); // 最低1週は表示
}

// スケジュール表示を更新
function updateScheduleIndicators() {
    // 既存のインジケーターを削除
    document.querySelectorAll('.schedule-indicator').forEach(el => el.remove());

    // すべてのhas-scheduleクラスを削除
    document.querySelectorAll('.day-cell.has-schedule').forEach(el => {
        el.classList.remove('has-schedule');
    });

    // スケジュールがある日付にマークを付ける
    schedules.forEach(schedule => {
        const dayCells = document.querySelectorAll(`[data-date="${schedule.date}"]`);
        dayCells.forEach(dayCell => {
            dayCell.classList.add('has-schedule');

            // 日付セルの位置を取得
            const rect = dayCell.getBoundingClientRect();
            const column = dayCell.closest('.calendar-column');
            if (!column) return;

            const columnRect = column.getBoundingClientRect();

            // セルの中心からの相対位置
            const startX = rect.left - columnRect.left + rect.width / 2;
            const startY = rect.top - columnRect.top + rect.height / 2;

            // 右上に伸ばす（段の右端の少し外側）
            const endX = column.offsetWidth + 10;
            const endY = Math.max(0, startY - 50);

            // 線を描画
            const indicator = document.createElement('div');
            indicator.className = 'schedule-indicator';

            const line = document.createElement('div');
            line.className = 'schedule-line';
            const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;

            line.style.width = `${length}px`;
            line.style.left = `${startX}px`;
            line.style.top = `${startY}px`;
            line.style.transform = `rotate(${angle}deg)`;

            // ラベルを配置
            const label = document.createElement('div');
            label.className = 'schedule-label';
            label.textContent = schedule.name;
            label.style.left = `${endX + 5}px`;
            label.style.top = `${endY - 10}px`;

            indicator.appendChild(line);
            indicator.appendChild(label);
            column.appendChild(indicator);
        });
    });
}

// カレンダーを生成する関数
function generateCalendar() {
    const startDateInput = document.getElementById('startDate').value;
    const dayCount = parseInt(document.getElementById('dayCount').value);

    if (!startDateInput) {
        alert('開始日を選択してください');
        return;
    }

    if (isNaN(dayCount) || dayCount < 1) {
        alert('有効な日数を入力してください');
        return;
    }

    const startDate = new Date(startDateInput);
    const dates = getDateArray(startDate, dayCount);

    const calendar = document.getElementById('calendar');
    calendar.innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 週ごとにグループ化
    const weeks = [];
    let currentWeek = [];
    let weekStartDate = null;

    dates.forEach((date, index) => {
        const dayOfWeek = getDayOfWeek(date);

        // 新しい週の開始
        if (dayOfWeek === 0 || index === 0) {
            if (currentWeek.length > 0) {
                weeks.push({ days: currentWeek, startDate: weekStartDate });
            }
            currentWeek = [];
            weekStartDate = new Date(date);

            // 最初の週で日曜日でない場合、空白セルを追加
            if (index === 0 && dayOfWeek !== 0) {
                for (let i = 0; i < dayOfWeek; i++) {
                    currentWeek.push(null); // null = 空白セル
                }
            }
        }

        currentWeek.push(date);
    });

    // 最後の週を追加
    if (currentWeek.length > 0) {
        weeks.push({ days: currentWeek, startDate: weekStartDate });
    }

    // 段ごとに分割
    const weeksPerColumn = getWeeksPerColumn() || 20;
    let currentColumn = null;
    let weekCountInColumn = 0;
    let lastYearInColumn = null;
    let lastMonthInColumn = null;

    weeks.forEach((week, weekIndex) => {
        // 新しい段が必要か判断
        if (!currentColumn || weekCountInColumn >= weeksPerColumn) {
            currentColumn = document.createElement('div');
            currentColumn.className = 'calendar-column';
            calendar.appendChild(currentColumn);
            weekCountInColumn = 0;
            lastYearInColumn = null;
            lastMonthInColumn = null;

            // 曜日ヘッダーを追加
            const weekdayHeader = document.createElement('div');
            weekdayHeader.className = 'weekday-header';

            const headerLabel = document.createElement('div');
            headerLabel.className = 'weekday-header-label';
            weekdayHeader.appendChild(headerLabel);

            const headerDays = document.createElement('div');
            headerDays.className = 'weekday-header-days';

            const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
            weekdays.forEach((day, index) => {
                const dayCell = document.createElement('div');
                dayCell.className = 'weekday-header-day';
                if (index === 0) dayCell.classList.add('sunday');
                if (index === 6) dayCell.classList.add('saturday');
                dayCell.textContent = day;
                headerDays.appendChild(dayCell);
            });

            weekdayHeader.appendChild(headerDays);
            currentColumn.appendChild(weekdayHeader);
        }

        // 週の行を作成
        const weekRow = document.createElement('div');
        weekRow.className = 'week-row';

        // 年/月ラベルを決定（この週に1日が含まれているかチェック）
        let labelText = '';
        const hasFirstDayOfMonth = week.days.some(d => d !== null && d.getDate() === 1);

        if (hasFirstDayOfMonth) {
            const firstDayOfMonth = week.days.find(d => d !== null && d.getDate() === 1);
            const year = firstDayOfMonth.getFullYear();
            const month = firstDayOfMonth.getMonth() + 1;

            // 常に年を表示
            labelText = `${year}/${String(month).padStart(2, '0')}`;
            lastYearInColumn = year;
            lastMonthInColumn = month;
        }

        // ラベルセルを追加（常に追加）
        const weekLabelCell = document.createElement('div');
        weekLabelCell.className = 'week-label-cell';
        if (labelText === '') {
            weekLabelCell.classList.add('empty');
        } else {
            weekLabelCell.textContent = labelText;
        }
        weekRow.appendChild(weekLabelCell);

        // 週の日付セルを作成
        const weekDays = document.createElement('div');
        weekDays.className = 'week-days';

        week.days.forEach((date) => {
            const dayCell = document.createElement('div');
            dayCell.className = 'day-cell';

            // null（空白セル）の場合
            if (date === null) {
                dayCell.classList.add('empty');
                weekDays.appendChild(dayCell);
                return;
            }

            const dayOfWeek = getDayOfWeek(date);
            const day = date.getDate();

            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            // 祝日チェック
            const isHoliday = holidays[dateStr];

            // 日曜日・土曜日・祝日のクラスを追加
            if (isHoliday || dayOfWeek === 0) {
                dayCell.classList.add('holiday');
            } else if (dayOfWeek === 6) {
                dayCell.classList.add('saturday');
            }

            // 今日の日付をハイライト
            const cellDate = new Date(date);
            cellDate.setHours(0, 0, 0, 0);
            if (cellDate.getTime() === today.getTime()) {
                dayCell.classList.add('today');
            }

            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = day;

            dayCell.appendChild(dayNumber);

            // タイトルに祝日名を追加
            dayCell.title = isHoliday ? `${dateStr} (${isHoliday})` : dateStr;
            dayCell.dataset.date = dateStr;

            // 日付クリックイベント
            dayCell.addEventListener('click', () => {
                document.getElementById('newScheduleDate').value = dateStr;
                document.getElementById('newScheduleName').focus();
            });

            weekDays.appendChild(dayCell);
        });

        weekRow.appendChild(weekDays);
        currentColumn.appendChild(weekRow);
        weekCountInColumn++;
    });

    // スケジュール表示を更新（カレンダー生成後）
    setTimeout(() => updateScheduleIndicators(), 100);
}

// イベントリスナーの設定
document.getElementById('generateBtn').addEventListener('click', generateCalendar);

// Enterキーでも生成できるように
document.getElementById('startDate').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') generateCalendar();
});

document.getElementById('dayCount').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') generateCalendar();
});

// ウィンドウリサイズ時に再生成
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const startDateInput = document.getElementById('startDate').value;
        if (startDateInput && calendar.children.length > 0) {
            generateCalendar();
        }
    }, 300);
});

// スケジュール管理
let schedules = [];

// LocalStorageからスケジュールを読み込み
function loadSchedules() {
    const saved = localStorage.getItem('calendarSchedules');
    if (saved) {
        try {
            schedules = JSON.parse(saved);
        } catch (e) {
            console.error('スケジュールの読み込みに失敗しました:', e);
            schedules = [];
        }
    }
}

// LocalStorageにスケジュールを保存
function saveSchedules() {
    localStorage.setItem('calendarSchedules', JSON.stringify(schedules));
}

// スケジュールをクリア
function clearSchedules() {
    if (confirm('すべてのスケジュールを削除してもよろしいですか？')) {
        schedules = [];
        saveSchedules();
        renderSchedules();

        // スケジュールボックスの高さが変わるため、カレンダーを再描画
        setTimeout(() => {
            generateCalendar();
        }, 100);
    }
}

// スケジュールを追加
function addSchedule() {
    const dateInput = document.getElementById('newScheduleDate');
    const nameInput = document.getElementById('newScheduleName');

    const date = dateInput.value;
    const name = nameInput.value.trim();

    if (!date) {
        alert('日付を選択してください');
        return;
    }

    if (!name) {
        alert('スケジュール名を入力してください');
        return;
    }

    schedules.push({ date, name });
    schedules.sort((a, b) => new Date(a.date) - new Date(b.date));

    // 入力欄をクリア
    dateInput.value = '';
    nameInput.value = '';

    saveSchedules();
    renderSchedules();

    // スケジュールボックスの高さが変わるため、カレンダーを再描画
    setTimeout(() => {
        generateCalendar();
    }, 100);
}

// スケジュールを削除
function deleteSchedule(index) {
    schedules.splice(index, 1);
    saveSchedules();
    renderSchedules();

    // スケジュールボックスの高さが変わるため、カレンダーを再描画
    setTimeout(() => {
        generateCalendar();
    }, 100);
}

// スケジュールリストを描画
function renderSchedules() {
    const scheduleList = document.getElementById('scheduleList');

    if (schedules.length === 0) {
        scheduleList.innerHTML = '<p class="schedule-placeholder">スケジュールがありません</p>';
        return;
    }

    scheduleList.innerHTML = schedules.map((schedule, index) => {
        const dateObj = new Date(schedule.date);
        const formattedDate = `${dateObj.getFullYear()}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`;

        return `
            <div class="schedule-item">
                <span class="schedule-item-date">${formattedDate}</span>
                <span class="schedule-item-name">${schedule.name}</span>
                <button class="schedule-item-delete" onclick="deleteSchedule(${index})">×</button>
            </div>
        `;
    }).join('');
}

// スケジュール追加イベントリスナー
document.getElementById('addScheduleBtn').addEventListener('click', addSchedule);

// Enterキーでスケジュール追加
document.getElementById('newScheduleName').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addSchedule();
});

// クリアボタンイベントリスナー
document.getElementById('clearSchedulesBtn').addEventListener('click', clearSchedules);

// 初期化
async function initialize() {
    const loadingScreen = document.getElementById('loadingScreen');

    try {
        loadSchedules(); // LocalStorageから読み込み
        await fetchHolidays();
        initializeDefaults();
        generateCalendar();
        renderSchedules();
    } finally {
        // カレンダー生成後、少し遅延してから非表示にする（スムーズな表示のため）
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
        }, 300);
    }
}

initialize();
