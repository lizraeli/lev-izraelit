---
title: "Building a Covid-19 Case Tracker by US State and County - Part 1"
date: "2020-04-19"
draft: false
path: "/blog/covid-19-case-tracker-1"
---

# Introduction

In this series of articles we will use the [New York Times Covid-19 data](https://github.com/nytimes/covid-19-data) to create a case tracker, which will display the data as a time series. Users will be able to view data for the US as a whole, or narrow it down by state and by county. The complete web app is available on GitHub - [covid-19-us](https://github.com/lizraeli/covid-19-us) and a live version is hosted at http://covid19-us.levizraelit.com. We will use React and Typescript along with other libraries for UI and chart visualization. If you have not used Typescript before, these articles will also introduce you to some of the fundamentals and more advanced concepts of the language.

![Case tracker Screenshort](/covid-case-tracker-1.png)

## Taking a look at the data

The data in the [New York Times Covid-19 dateset](https://github.com/nytimes/covid-19-data) is hosted in 3 csv file - [us.csv](https://github.com/nytimes/covid-19-data/blob/master/us.csv), [us-states.csv](https://github.com/nytimes/covid-19-data/blob/master/us-states.csv)  and [us-counties.csv](https://github.com/nytimes/covid-19-data/blob/master/us-counties.csv). We can see each of these files in its raw form by clicking on the `Raw` button at the top right corner.

#### US Data

 Looking at the [raw US data](https://raw.githubusercontent.com/nytimes/covid-19-data/master/us.csv), we can see the following:

```
date,cases,deaths
2020-01-21,1,0
2020-01-22,1,0
2020-01-23,1,0
2020-01-24,2,0
2020-01-25,3,0
2020-01-26,5,0
2020-01-27,5,0
...
```

The file consists of 3 columns, where the first row contains the column names: `date`, `cases` and `deaths`. The subsequent rows contain values for each the three columns.

#### State Data

The [US State data](https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-states.csv) contains two additional columns: `state` and `fips`. A [FIPS code](https://www.census.gov/quickfacts/fact/note/US/fips)  is a  geographic identifier that we will not use for this project. 

```
date,state,fips,cases,deaths
...
2020-02-06,Washington,53,1,0
2020-02-06,Wisconsin,55,1,0
2020-02-07,Arizona,04,1,0
2020-02-07,California,06,6,0
...
```

#### County Data

The [US County Data](https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-counties.csv) contains a  `county` column in addition to all the columns found in the state data:

```
date,county,state,fips,cases,deaths
...
2020-02-01,Orange,California,06059,1,0
2020-02-01,Santa Clara,California,06085,1,0
2020-02-01,Cook,Illinois,17031,2,0
2020-02-01,Suffolk,Massachusetts,25025,1,0
2020-02-01,Snohomish,Washington,53061,1,0
...
```

### Parsing the data

We will use [Papaprse](https://www.papaparse.com/) to parse the csv data directly in the browser. For our first attempt we'll render the US state data in the browser using `innerHTML`, so we can see can see how parsing works. You can head on to the [codesandbox](https://codesandbox.io/s/ny-times-data-parse-902t9?file=/src/index.ts) to see the result.  

#### The shape of the data

The first thing you'll notice in the example is a Typescript [interface](https://www.typescriptlang.org/docs/handbook/interfaces.html):

```typescript
interface StateCaseData {
  date: string;
  state: string;
  cases: number;
  deaths: number;
}
```

An interface defines the shape of some data, regardless of the source. In this instance, we are receiving the data from a CSV file that is downloaded and then parsed. Having looked at the raw CSV containing the US state data, we can assume that the data will be parsed into an array of objects that conform to the `StateCaseData` interface. 


#### The parse result

Once we have imported Papaparse:

```typescript
import ParseCSV from "papaparse";
```

we can call the [parse](https://www.papaparse.com/docs#remote-files) method, providing the URL for the [US State data csv](https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-states.csv) and an object containing additional arguments:

```typescript
ParseCSV.parse(US_CSV_URL, {
  download: true,
  header: true,
  dynamicTyping: true,
  complete: parseResult => {
    console.log("errors: ", parseResult.errors);
    const data = parseResult.data.filter(isStateCaseData);
    renderStateData(data);
  }
});
```

These are the arguments contained in the object:

- `download`: indiates that the file needs to be downloaded
- `header`: indicates that the first row in the file contains the column names
- `dynamicTyping`: indicates that we'd like Papaparse to convert numbers and booleans to their respective types, rather than converting them to strings.
- `complete`: a callback that describes what we'd like to do once the parsing is done. Paparse will invoke this callback with a [results object](https://www.papaparse.com/docs#results) which contains a `data` property - an an array of objects keyed by the field name.  It also contains an `errors` property, an array of string. At at the moment of writing this array is empty, meaning there are no errors parsing the CSV. 

A few words about parsing the `data` property in the `parseResult`. Earlier I said we can assume that each object in the data parsed from the CSV will conform to the `StateCaseData` interface.  But we don't want to assume that the data will always be correct. In fact, the type of `parseResult.data`  is defined as `any[]` - an array where the elements may be of any type whatsover. What if some of the elements in this array are missing a `cases` or `state` property? What we want is to only keep those objects that actually confrom to the `StateCaseData` interface, and discard the rest. We can do this by defining a function called `isStateCaseData` that, when given an element as an argument, returns `true` if it conforms to the `StateCaseData` interface and `false` otherwise:

```typescript
function isStateCaseData(dataElem: any): data is StateCaseData {
  return (
    !!dataElem &&
    isString(dataElem.date) &&
    isString(dataElem.state) &&
    isNumber(dataElem.cases) &&
    isNumber(dataElem.deaths)
  );
}

const isString = (value: any): value is String => typeof value === "string";

const isNumber = (value: any): value is Number => typeof value === "number";

```

The return type of `isStateCaseData` is a [type predicate](https://www.typescriptlang.org/docs/handbook/advanced-types.html#using-type-predicates). This function is in fact a [type guard](https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards) - a function that returns a boolean indicating if the argument passed to it is of the stated type. To determine if the type  `dataElem` is `StateCaseData` or not, we need check the types of each of its properties: `date` and `state` must be strings; `cases` and `deaths` must be numbers. These type checks are performed via their own type guards: `isString` and `isNumber`. But first we need to verify that the argument is not `null` or `undefined` - if that is the case, trying to access any property will result in a runtime error. We verify this by using [double bangs](https://medium.com/better-programming/javascript-bang-bang-i-shot-you-down-use-of-double-bangs-in-javascript-7c9d94446054), which will coerce the argument to a boolean. If the argument is `null` or `undefined`, it will be coerced to `false`, and the check will be [short-circuited](https://en.wikipedia.org/wiki/Short-circuit_evaluation).

Going back to where we filter the `parseResult` data:

```typescript
const data = parseResult.data.filter(isStateCaseData);
```

If we hover over `data` we'll see that Typescript has inffered the type as `StateCaseData[]` - we have validated that each element in the list is of `StateCaseData` type. Finally, we can render the data by passing it to the `renderStateData` function. This function simply iterates over the data array and renders the values of  `date`, `state`, and `cases` of each element.


This completes the first part of the series. In the next part we will group the data in a way that allows us to render it into charts and `<select>` elements.

