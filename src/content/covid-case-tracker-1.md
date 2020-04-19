---
title: "Building a Covid 19 Case Tracker - Part 1"
date: "2020-04-19"
draft: false
path: "/blog/covid-19-case-tracker-1"
---

# Introduction

In this series of articles we will use the [New York Times Covid-19 dateset](https://github.com/nytimes/covid-19-data) to create a case tracker, in which we will display data as a time series of the US, by state or by county. The complete web app is available on GitHub - [covid-19-us](https://github.com/lizraeli/covid-19-us) and an live version is hosted at http://covid19-us.levizraelit.com. We will use React and Typescript along with libraries for UI and chart visualization. If you have not used Typescript before, this would also introduce you to some of the fundamentals of the language.



![cov-19-viewer](/Users/lev.izraelit/Desktop/cov-19-viewer.png)



## Taking a look at the data

The data in the [New York Times Covid-19 dateset](https://github.com/nytimes/covid-19-data) is hosted on GitHub in 3 csv file - [us.csv](https://github.com/nytimes/covid-19-data/blob/master/us.csv), [us-states.csv](https://github.com/nytimes/covid-19-data/blob/master/us-states.csv)  and [us-counties.csv](https://github.com/nytimes/covid-19-data/blob/master/us-counties.csv). We can see each of these files in its raw form by clicking on the `Raw` button at the top right corner.

#### US Data

 Looking at the [raw US data](https://raw.githubusercontent.com/nytimes/covid-19-data/master/us.csv), we can see that the following structure of data:

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

The file consists of 3 columns, where the first row indicates the column names: `date`, `cases` and `deaths`. The subsequent rows each contains values for each the three columns.

#### State Data

The [US State data](https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-states.csv) contains two additional columns: `state` and `fips`. A [FIPS code](https://www.census.gov/quickfacts/fact/note/US/fips)  is a  geographic identifier that we will not use for the time being. 

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

The [US County Data](https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-counties.csv) contains one column in addition to the state data: `county`:

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

We will use [Papaprse](https://www.papaparse.com/) to parse the csv data in the browser. For our first attempt we'll just render the state data in the browser using `innerHTML` to see how the parsing works. You can head on to the [code in codesandbox](https://codesandbox.io/s/ny-times-data-parse-902t9?file=/src/index.ts) to see the result.  

#### The shape of the data

The first thing you will see in the example is a Typescript [interface](https://www.typescriptlang.org/docs/handbook/interfaces.html):

```typescript
interface StateCaseData {
  date: string;
  state: string;
  cases: number;
  deaths: number;
}
```

An interface gives a way to define the shape of data, whether it's data that we will create or data we receive from an an external source (user input, API calls). In this case we are receiving the data from a CSV file that is downloaded and then parsed. Having looked at the raw CSV, we can assume that the data will be parsed into an array of objects, each having the properties defined in the `StateCaseData` interface. 



#### The parse result

Now we'll import Papaprse:

```typescript
import ParseCSV from "papaparse";
```

and call the [parse](https://www.papaparse.com/docs#remote-files) method, providing the URL for the raw [US State data](https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-states.csv) and some additional arguments:

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

The additional arguments:

- `download` indiates that the first argument that needs to be downloaded
- `header` indicates that the first row is a header with the column names
- `dynamicTyping` indicates that we'd Papaparse to convert number and boolean to their respective types rather than keeping them as strings.

The `complete` callback describes what we'd like to do once the parsing is done. This callback is provided with a [results](https://www.papaparse.com/docs#results) object, which contains a `data` property - an an array of objects of data keyed by the field name.  It also contains an array of `errors`, which at the moment of writing is an empty array, meaning there are no errors parsing the CSV. 

Now we come to the issue of the `data` property on `parseResult`. Earlier I said we can assume that the data parsed from the CSV will have the properties defined in the `StateCaseData` interface. And at the moment, if I pass `parseResult.data` to the `renderStateData` function, everything works as expected. But we don't want to assume that data will always be correct. In fact the type of `parseResult.data`  is defined as `any[] `   - whiche means it is an array where each element may be of any type whatsover. What if some of the elements in this array were missing a `cases` or `state` property? What we would want is to only keep those objects that actually confrom to the ``StateCaseData` interface. We do this by defining a function called `isStateCaseData`:

```typescript
function isStateCaseData(dataElem: any): data is StateCaseData {
  return (
    isString(dataElem.date) &&
    isString(dataElem.state) &&
    isNumber(dataElem.cases) &&
    isNumber(dataElem.deaths)
  );
}

const isNumber = (value: any): value is Number => typeof value === "number";

const isString = (value: any): value is String => typeof value === "string";
```

Looking at `isStateCaseData` - the return type would propbably be the first thing that stands out: `dataElem is StateCaseData`. This function is in fact a [type guard](https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards) - a function that returns a boolean which indicates if the argument is of the stated type . Here the function would return `true` if the `dataElem` argument is of the `StateCaseData` type and false otherwise. We do this by checking the types of each of the properties of `dataElem`: `date` and `state` must be a strings; `cases` and `deaths` must be numbers. This type checks are performed via their own type guards `isString` and `isNumber`.

Going back to 

```typescript
const data = parseResult.data.filter(isStateCaseData);
```

If we hover over `data` we'll see that the inferred type is `StateCaseData[]` - we have validated that each element in the list is in fact of `StateCaseData` type. 

Finally, we pass the data to the `renderStateData` which simply iterates over the array and renders the date, state, and cases of each element.



That's all for this time. In the next part of this series we will take the first steps in using the parsed data in a React application.

