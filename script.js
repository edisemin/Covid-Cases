"use strict";

const buttonEl = document.querySelector("#button");
const monthNameEl = document.querySelector("#month");
const dataIntervalEl = document.querySelector("#data-interval");

const specificDateEl = document.querySelector("#specific-date");
const specificDateEqEl = document.querySelector("#specific-date-equal");
const specificDatelessEl = document.querySelector("#specific-date-less");
const specificDateMoreEl = document.querySelector("#specific-date-more");

const top10El = document.querySelector("#top-10");
const tableEl = document.querySelector("#data-table");
const errorMsgEl = document.querySelector("#error-message");
const formEl = document.querySelector("#main-form");

const xmlObj = {
  casesXml: null,
  hospitalXml: null,
  testingXml: null,
};

const months = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

function validateEnteredDate() {
  let enteredDate = specificDateEl.value;

  var regEx = /^\d{4}-\d{2}-\d{2}$/;
  if (!enteredDate.match(regEx)) {
    specificDateEl.classList.add("error-input");
    errorMsgEl.textContent = "You must enter a date in yyyy-mm-dd format.";
    return false; // invalid format
  }
  var d = new Date(enteredDate);
  var dNum = d.getTime();
  if (!dNum && dNum !== 0) {
    specificDateEl.classList.add("error-input");
    errorMsgEl.textContent = `${enteredDate} is not a valid date.`;
    return false; // invalid date
  }
  if (!d.toISOString().slice(0, 10) === enteredDate) {
    specificDateEl.classList.add("error-input");
    errorMsgEl.textContent = `${enteredDate} is not a valid date.`;
    return false;
  }

  if (
    !specificDateEqEl.checked &&
    !specificDateMoreEl.checked &&
    !specificDatelessEl.checked
  ) {
    errorMsgEl.textContent =
      "You must check one of the buttons (More than, Equal, Less than)";
    return false;
  }

  return true;
}

function displayXML() {
  errorMsgEl.textContent = "";
  specificDateEl.classList.remove("error-input");
  /* Read the user options and update table according to XML and entered query */
  let tableText;

  if (top10El.value != "none") {
    /* Option 3. display the top 10 days for the selected category */
    let category = top10El.value;

    if (specificDateEl.value != "") {
      // top 10 days according to entered date
      if (!validateEnteredDate()) return;
      let enteredDate = specificDateEl.value; // must be yyyy-mm-dd
      if (specificDateEqEl.checked)
        tableText = getTableTextTop10(category, enteredDate, enteredDate);
      else if (specificDatelessEl.checked)
        tableText = getTableTextTop10(category, "2020-01-01", enteredDate);
      else if (specificDateMoreEl.checked)
        tableText = getTableTextTop10(category, enteredDate, "2020-12-31");
    } else {
      // top 10 days of a single month or all months
      if (monthNameEl.value == "all") {
        tableText = getTableTextTop10(category, "2020-01-01", "2020-12-31");
      } else {
        let mm = months.indexOf(monthNameEl.value) + 1;
        mm = mm < 10 ? `0${mm}` : `${mm}`;
        tableText = getTableTextTop10(
          category,
          `2020-${mm}-01`,
          `2020-${mm}-31`
        );
      }
    }
  } else if (specificDateEl.value != "") {
    /* Option 2. display COVID information for just entered day, all previous days or all subsequent days */
    if (!validateEnteredDate()) return;
    let enteredDate = specificDateEl.value; // must be yyyy-mm-dd
    if (specificDateEqEl.checked)
      tableText = getTableText(true, enteredDate, enteredDate);
    else if (specificDatelessEl.checked)
      tableText = getTableText(true, "2020-01-01", enteredDate);
    else if (specificDateMoreEl.checked)
      tableText = getTableText(true, enteredDate, "2020-12-31");
  } else {
    /* Option 1. User choses month name and data interval (monthly or daily) */
    if (monthNameEl.value == "all") {
      tableText = getTableText(
        dataIntervalEl.value === "daily",
        "2020-01-01",
        "2020-12-31"
      );
    } else {
      let mm = months.indexOf(monthNameEl.value) + 1;
      mm = mm < 10 ? `0${mm}` : `${mm}`;
      tableText = getTableText(
        dataIntervalEl.value === "daily",
        `2020-${mm}-01`,
        `2020-${mm}-31`
      );
    }
  }
  tableEl.innerHTML = tableText;
}

function getTableText(getDaily, startDate, endDate) {
  let tableText =
    "<thead><tr><th>Date</th><th>Cases</th><th>Tests</th><th>Test Capacity</th><th>Paients in Hospital</th></tr></thead>";
  let cas = xmlObj.casesXml.responseXML.getElementsByTagName("data");
  let hos = xmlObj.hospitalXml.responseXML.getElementsByTagName("data");
  let tes = xmlObj.testingXml.responseXML.getElementsByTagName("data");
  // date in yyyy-mm-dd format, each XML has different start and end dates (bad)
  // but cases.xml has the earliest at 2020-01-02
  let [casIdx, hosIdx, tesIdx, foundHosRow, foundTesRow] = [
    0,
    0,
    0,
    false,
    false,
  ];
  let [casesTd, testsTd, testCapacityTd, patientsTd] = [0, 0, 0, 0];
  let display = false;
  for (casIdx = 0; casIdx < cas.length; casIdx++) {
    let date = cas[casIdx].getElementsByTagName("date")[0].childNodes[0]
      .nodeValue;

    if (date < startDate) return tableText; // read dates from high to low

    if (date <= endDate) {
      // find hospital.xml, testing.xml row with the same date
      [tesIdx, foundTesRow] = getXmlIdx(date, tesIdx, tes);
      [hosIdx, foundHosRow] = getXmlIdx(date, hosIdx, hos);

      if (getDaily) {
        casesTd = cas[casIdx].getElementsByTagName("newCasesByPublishDate")[0]
          .childNodes[0].nodeValue;

        testsTd = foundTesRow
          ? tes[tesIdx]?.getElementsByTagName("newPCRTestsByPublishDate")[0]
              ?.childNodes[0]?.nodeValue ?? "N/A"
          : "N/A";

        testCapacityTd = foundTesRow
          ? tes[tesIdx]?.getElementsByTagName(
              "plannedPCRCapacityByPublishDate"
            )[0]?.childNodes[0]?.nodeValue ?? "N/A"
          : "N/A";

        patientsTd = foundHosRow
          ? hos[hosIdx]?.getElementsByTagName("hospitalCases")[0]?.childNodes[0]
              ?.nodeValue ?? "N/A"
          : "N/A";
        display = true;
      } else {
        // monthly data to be displayed
        casesTd += Number(
          cas[casIdx].getElementsByTagName("newCasesByPublishDate")[0]
            .childNodes[0].nodeValue
        );

        testsTd += foundTesRow
          ? Number(
              tes[tesIdx]?.getElementsByTagName("newPCRTestsByPublishDate")[0]
                ?.childNodes[0]?.nodeValue ?? 0
            )
          : 0;

        testCapacityTd += foundTesRow
          ? Number(
              tes[tesIdx]?.getElementsByTagName(
                "plannedPCRCapacityByPublishDate"
              )[0]?.childNodes[0]?.nodeValue ?? 0
            )
          : 0;

        patientsTd += foundHosRow
          ? Number(
              hos[hosIdx]?.getElementsByTagName("hospitalCases")[0]
                ?.childNodes[0]?.nodeValue ?? 0
            )
          : 0;

        if ((date.slice(-2) === "01") || (date.slice(-2) === "02")) {
          display = true;
        }
      }

      if (display) {
        tableText +=
          "<tr><td>" +
          (getDaily ? date : date.slice(0, -3)) +
          "</td><td>" +
          casesTd +
          "</td><td>" +
          testsTd +
          "</td><td>" +
          testCapacityTd +
          "</td><td>" +
          patientsTd +
          "</td></tr>";
        display = false;
      }

      if (!getDaily && date.slice(-2) === "01") {
        // reset counts as we are counting monthly!
        [casesTd, testsTd, testCapacityTd, patientsTd] = [0, 0, 0, 0];
      }
    }
  }

  return tableText;
}

function getTableTextTop10(
  category = "newCasesByPublishDate",
  startDate,
  endDate
) {
  let tableText = "<thead><tr><th>Date</th><th>Top 10</th></tr></thead>";
  let data;
  if (category === "newCasesByPublishDate") {
    data = xmlObj.casesXml.responseXML.getElementsByTagName("data");
  } else if (
    category === "newPCRTestsByPublishDate" ||
    category === "plannedPCRCapacityByPublishDate"
  ) {
    data = xmlObj.testingXml.responseXML.getElementsByTagName("data");
  } else if (category === "hospitalCases") {
    data = xmlObj.hospitalXml.responseXML.getElementsByTagName("data");
  } else {
    return "";
  }

  let top10 = [];

  for (let i = 0; i < data.length; i++) {
    let date = data[i].getElementsByTagName("date")[0].childNodes[0].nodeValue;

    if (date < startDate) break; // read dates from high to low

    if (date <= endDate) {
      // get value for category on this day
      // if it is within top10 update the top10 array
      let val = Number(
        data[i]?.getElementsByTagName(category)[0]?.childNodes[0]?.nodeValue ??
          0
      );
      top10.push([val, date]);
    }
  }
  top10.sort((a, b) => b[0] - a[0]);
  for (let [val, date] of top10.slice(0, 10)) {
    if (date === null) continue;
    tableText += "<tr><td>" + date + "</td><td>" + val + "</td></tr>";
  }

  return tableText;
}

function getXmlIdx(date, curIdx, xmlData) {
  // dates are read from cases.xml file from high to low
  while (curIdx < xmlData.length) {
    let otherDate = xmlData[curIdx].getElementsByTagName("date")[0]
      .childNodes[0].nodeValue;
    if (date === otherDate) return [curIdx, true];
    if (otherDate < date) return [curIdx, false];
    curIdx += 1;
  }
  return [curIdx, false];
}

function loadXML(xmlFileName, xmlObjPropertyName) {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      xmlObj[xmlObjPropertyName] = this;
      if (Object.values(xmlObj).includes(null)) return;
      displayXML();
    }
  };
  xmlhttp.open("GET", xmlFileName, true);
  xmlhttp.send();
}

let submitFunc = function () {
  if (Object.values(xmlObj).includes(null)) {
    loadXML("cases.xml", "casesXml");
    loadXML("hospital.xml", "hospitalXml");
    loadXML("testing.xml", "testingXml");
  } else {
    displayXML();
  }
};

buttonEl.addEventListener("click", function () {
  submitFunc();
});

formEl.addEventListener("submit", function (event) {
  submitFunc();
  event.preventDefault();
});
