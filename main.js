const book = SpreadsheetApp.getActiveSpreadsheet();
const mail_addr = Session.getActiveUser().getEmail();
const appURL = ScriptApp.getService().getUrl();

const configs = book.getSheetByName("設定").getRange(1, 2, 7, 10).getValues();
let id = configs[0][0];
let g1_folder = configs[1][0];
let g2_folder = configs[2][0];
let g3_folder = configs[3][0];
let condition_arr = configs[4];
let attendance_arr = configs[5].filter(v => v);
let contact_p_arr = configs[6].filter(v => v);

let result_log;

let sheets = [];
sheets.push(book.getSheetByName("1年"));
sheets.push(book.getSheetByName("2年"));
sheets.push(book.getSheetByName("3年"));

function testFunc() {
	const sheet = sheets[1];
	const value = sheet.getRange(177, 6).getValue();

  if (value.indexOf("@") !== -1) console.log(value);
	// const rows = values.map(item => item[0]).filter(v => v);
	// const codes = values.map(item => item[1]).filter(v => v);
	// const classes = values.map(item => item[2]).filter(v => v);
	// const numbers = values.map(item => item[3]).filter(v => v);
	// const names = values.map(item => item[4]).filter(v => v);
	// let row = codes.findIndex(v => v == 2523);

  // let row = values.reduce((arr, val, i) => (val == "" && arr.push(i), arr), []);
  // let values = sheets[i].getRange(1, 6, last_row, 2).getValues();
  // let addrs = values.map(item => item[0]);
  // let status = values.map(item => item[1]);
  // let row = status.reduce((arr, val, i) => (val == "" && arr.push(i), arr), []);
}

function doGet(e) {
	const page = e.parameters.p;  // e.parameters["p"]

  if(page == "registration") {
		return HtmlService.createTemplateFromFile("registration").evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).setTitle("健康連絡フォーム登録用").addMetaTag("viewport", "width=device-width, initial-scale=1");
	} else if (page == "check") {
		checkData();
		result_log = "未送信確認完了";
		return HtmlService.createTemplateFromFile("after").evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).setTitle("健康連絡フォーム確認用").addMetaTag("viewport", "width=device-width, initial-scale=1");
	} else {
		return HtmlService.createTemplateFromFile("index").evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).setTitle("健康連絡フォーム").addMetaTag("viewport", "width=device-width, initial-scale=1");
	}
}

function doPost(e) {
	const p = e.parameters;

	if (p.mail_addr) {
		registMailAddr(p.grade, p.class_, p.number, p.mail_addr);
    result_log = "登録しました";
		return HtmlService.createTemplateFromFile("after").evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).setTitle("健康連絡フォーム").addMetaTag("viewport", "width=device-width, initial-scale=1");
	}

	const grade = p.grade;
	const attendance = attendance_arr[parseInt(p.attendance)];
	const contact_p = contact_p_arr[parseInt(p.contact_p)];
	let p_data = contact_p;

	if (p.contact_p == 4) p_data = contact_p + "（" + p.other + "）"; // その他

  const sheet = sheets[grade - 1];
  const values = sheet.getRange(1, 1, sheet.getLastRow(), 6).getValues();
  const classes = values.map(item => item[2]).filter(v => v);
  const numbers = values.map(item => item[3]).filter(v => v);
  const addrs = values.map(item => item[5]).filter(v => v);

	const index = addrs.findIndex(v => v == mail_addr);

  if (index == -1) return HtmlService.createTemplateFromFile("error").evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).setTitle("健康連絡フォーム").addMetaTag("viewport", "width=device-width, initial-scale=1");
  let row = index + 1;
	const class_ = classes[index];
	const number = numbers[index];

	const datas = [p.mng_temp, p.ngt_temp, p.health_st, attendance, p_data, p.info];

  setDatas(grade, class_, number, row, datas);

	result_log = "送信しました";
	return HtmlService.createTemplateFromFile("after").evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME).setTitle("健康連絡フォーム").addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function setDatas(grade, class_, number, row, datas) {
	const sheet = book.getSheetByName(grade + "年");
  let msg = "";

  for (let i = 0; i < datas[2].length; i++) {
		msg += condition_arr[i] + ", ";
	}

	msg = msg.slice(0, -2);
	datas[2] = msg;

	sheet.getRange(row, 7, 1, 6).setValues([datas]);  // 2次元配列
  /*  内容
    [
      [mng_temp, ngt_temp, health_st, attendance, contact_p, info]
    ]
  */

	sendCopy(grade, class_, number, datas);
}

function sendCopy(grade, class_, number, datas) {
	const subject = "健康連絡フォーム"
	const options = {
		name: "健康連絡システム"
	};
	let text = "";

	text = "健康連絡が完了しました。"
			 + "\n\n送信したデータ"
			 + "\n学年：" + grade
			 + "\nクラス：" + class_
			 + "\n番号：" + number
			 + "\n起床時の体温(℃)：" + datas[0]
			 + "\n就寝時の体温(℃)：" + datas[1]
			 + "\n健康状態：" + datas[2]
			 + "\n出席の可否：" + datas[3]
			 + "\n連絡者(欠席・遅刻・早退のみ)：" + datas[4]
			 + "\n連絡事項：" + datas[5];

	GmailApp.sendEmail(mail_addr, subject, text, options);
}

function registMailAddr(grade, class_, num, addr) {
	const sheet = sheets[grade - 1];

	const values = sheet.getRange(1, 2, sheet.getLastRow(), 1).getValues().flat();
	const code = String(grade) + String(class_) + ("00" + num).slice(-2);

	const row = values.findIndex(v => v == code) + 1;
	sheet.getRange(row, 6).setValue(addr);
}

function checkData() {
	let last_row = 0;
	let nullList = [];

	for (let i = 0; i < 3; i++) {
		last_row = sheets[i].getLastRow();
    let values = sheets[i].getRange(1, 6, last_row, 2).getValues();
    let addrs = values.map(item => item[0]);
    let status = values.map(item => item[1]);
    let row = status.reduce((arr, val, i) => (val == "" && arr.push(i), arr), []);
    
    for (let j = 0; j < row.length; j++) {
      if (addrs[row[j]] == "" || addrs[row[j]].indexOf("@") === -1) {
        // メールアドレス未登録
      } else {
        nullList.push(addrs[row[j]]);
      }
    }
	}

	sendMail(nullList);
}

function sendMail(addr) {
	let addresses = "";

	for (let i = 0; i < addr.length; i++) {
		addresses += addr[i] + ", ";
	}

	const subject = "健康連絡について";
	const text = "本日分の健康連絡がまだ完了していません。\n速やかに送信してください。";
	const options = {
		bcc: addresses,
		name: "健康連絡システム"
	};

	GmailApp.sendEmail("", subject, text, options);
}

function checkDay() {
	const today = new Date();
	const calendar = CalendarApp.getCalendarById("calendar@apps.fudooka-h.ed.jp");
	const events = calendar.getEventsForDay(today);

	if (today.getDay() == 6) {
		for (let i = 0; i < events.length; i++) {
			if (events[i].getTitle() == "土曜授業") {
				checkData();
				return;
			}
		}
		// 授業なしの土曜
	} else if (today.getDay() == 0) {
		// 日曜
	} else {
		// 平日
		checkData();
	}
	deleteTrigger();
}

function createTrigger() {
	// const setTime = new Date();
	// setTime.setHours(8);
	// setTime.setMinutes(30);
	// ScriptApp.newTrigger("checkDay").timeBased().at(setTime).create();
}

function deleteTrigger() {
	const triggers = ScriptApp.getProjectTriggers();

	for (let trg of triggers) {
		if (trg.getHandlerFunction() === "checkDay") {
			ScriptApp.deleteTrigger(trg);
		}
	}
}

function clearSheet() {
	let last_row = 0;

	for (let i = 0; i < sheets.length; i++) {
		last_row = sheets[i].getLastRow();
		sheets[i].getRange(2, 7, last_row - 1, 6).clear();
	}
}

function output_csv() {
	const today = new Date();
	const folderIds = [];

	let data;
	let blob;
	let fileName;

	folderIds.push(g1_folder, g2_folder, g3_folder);

	for (let i = 0; i < 3; i++) {
		fileName = today.getFullYear() + "-" + parseInt(today.getMonth() + 1) + "-" + parseInt(today.getDate() - 1);
		data = sheets[i].getDataRange().getValues().join("\n");
		blob = Utilities.newBlob(data, MimeType.CSV, fileName + ".csv");
		DriveApp.getFolderById(folderIds[i]).createFile(blob);
	}

	clearSheet();
}

function createForm(choice) {
	let returnData = "";

	switch (choice) {
		case "health_st":
			for (let i = 0; i < 10; i++) {
		returnData += "<input type='checkbox' name='health_st' value='" + i + "'>" + condition_arr[i];
			}
			return returnData;

		case "attendance":
			for (let i = 0; i < 7; i++) {
		returnData += "<option value='" + i + "'>" + attendance_arr[i] + "</option>";
			}
			return returnData;

		case "contact_p":
			for (let i = 0; i < 5; i++) {
		returnData += "<option value='" + i + "'>" + contact_p_arr[i] + "</option>";
			}
			return returnData;
	}
}
