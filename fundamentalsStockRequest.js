const axios = require('axios');
const { Configuration, OpenAIApi } = require('openai');

  
const orgId = process.env.ORG_ID;
const apiKey = process.env.API_KEY;


// This should be able to answer questions like:
// Get me the latest balance sheet for AAPL
// Get me the latest income statement for AAPL
// Get me the latest cash flow statement for AAPL
// Get me the latest statement of shareholders equity for AAPL
// How much did Apple earn this year?
// How much cash does AAPL have on its balance sheet?
// How much cash flow came from investing activities for AAPL 

// openAI auth
  const configuration = new Configuration({
    orgId: orgId,
    apiKey: apiKey,
});
  const openai = new OpenAIApi(configuration);


  async function fundamentalsStockRequest(queryString) {
 // Stock Fundamentals - Not Complete & Nuanced - Not Tested
 var extractedStockName = await extractStockName(queryString);
 var extractedStatement = await extractStatement(queryString);
 // var extractedFilingYear = await extractFilingYear(queryString); // waiting till figure out regex issue.
 console.log(extractedStockName, extractedStatement);
 var apiLink = await createApiLink(extractedStockName, extractedStatement);
 console.log(apiLink);
 var apiCallData = await apiCall(apiLink); 
 var shortenedApiCallData = await shortenApiCallData(apiCallData);
 console.log("Data to be Summarized:",shortenedApiCallData);
 var summarizedData = await summarizeData(shortenedApiCallData, queryString);
 return summarizedData;

 async function extractStockName(queryString){
   const response = await openai.createCompletion({
     model: "text-davinci-003",
     prompt:
     `
     Please extract the company name from the following sentence, 
     convert it to a stock ticker format, 
     and format the output as "stockName: (converted stock ticker)"
     For example: "Apple" to "stockName: AAPL" or "Ford" to "stockName: F"
     Sentence: ${queryString}
     `,
     max_tokens: 512,
     stop: "/n"
   })
   return response.data.choices[0].text;
 }

 async function extractStatement(queryString){
   const response = await openai.createCompletion({
     model: "text-davinci-003",
     prompt:
     `
      Instructions: Read the queryString, and respond with the appropriate associated extractedStatement. 
      Finally, output the extractedStatement like ("extractedStatement: (insert here))

      queryString: ${queryString}

      Example Inputs & Outputs:

      (I: "Get me the Income statement for Apple in 2020.", O: "extractedStatement: Income_Statement")
      (I: "Get me the Balance Sheet for Apple in 2020.", O: "extractedStatement: Balance_Sheet")
      (I: "Get me the Cash Flow Statement for Apple in 2020.", O: "extractedStatement: Cash_Flow")
      (I: "How much did Apple earn in 2020?", O: "extractedStatement: Income_Statement")
      (I: "How much cash does AAPL have on its balance sheet?", O: "extractedStatement: Balance_Sheet")
      (I: "How much cash flow came from investing activities for AAPL in 2020?.", O: "extractedStatement: Cash_Flow")

     `,
     max_tokens: 1024,
     stop: "/n"
   })
   return response.data.choices[0].text;
 }

 //async function extractFilingYear(queryString){
//  const response = await openai.createCompletion({
 //   model: "text-davinci-003",
 //   prompt:
 //   `
  //   Instructions: Read the queryString, and extract the filing year being searched for. If there is no year, return 2022. 
  //   Finally, output the year only.
//
 //    queryString: ${queryString}
 //   `,
 //   max_tokens: 1024,
 //   stop: "/n"
 // })
  //return response.data.choices[0].text;
//}


 async function createApiLink(extractedStockName, extractedStatement) {
   const response = await openai.createCompletion({
     model: "text-davinci-003",
     prompt:
     `
     Instructions: Replace the variables extactedStatement and extractedStockName in the link with the passed in variables below.
     Output: apiLink: https://www.eodhistoricaldata.com/api/fundamentals/extractedStockName.US?api_token=63a2477acc2587.58203009&fmt=json&filter=Financials::extractedStatement::yearly
     extractedStatement: ${extractedStatement}
     extractedStockName: ${extractedStockName}
     `,
     max_tokens: 512,
     stop: "/n"
   })
   return response.data.choices[0].text; 
  }

   // apiCall function
   async function apiCall(apiLink) {
    const cleanedLink = await cleanLink(apiLink);
    const response = await axios.get(cleanedLink);
    return response.data;
  
    async function cleanLink(apiLink){
      var cleanedLink = apiLink.replace(/.*(https:\/\/)/, "https://");
      return cleanedLink;
    }    
  }
  // archived until I can figure it out - this would add in the functionality to search for past statements.
 // async function cleanApiCallData(apiCallData, extractedFilingYear) {
  //  const apiCallDataString = JSON.stringify(apiCallData);
  //  const lastExtractedFilingYear = extractedFilingYear - 1
  //  const regex = new RegExp(`"filing_date": "${extractedFilingYear}.*?(?="filing_date": "${lastExtractedFilingYear}|$)`, 'g');
   // const cleanedApiCallData = apiCallDataString.match(regex);
  //  return cleanedApiCallData;
  //}
  

  // new function its lazy tho - only allows for current statements.
  async function shortenApiCallData(apiCallData) {
    let stringifiedData = JSON.stringify(apiCallData);
    if(stringifiedData.length > 3000) {
      stringifiedData = stringifiedData.slice(0, 3000) + "...";
    }
    return stringifiedData;
  }
    
    // summarsizeData function
    async function summarizeData(shortenedApiCallData, queryString) {
      const date = new Date();
      let day = date.getDate();
      let month = date.getMonth() + 1;
      let year = date.getFullYear();
      const response = await openai.createCompletion({
          model: "text-davinci-003",
          prompt: `
          Instructions: Take in the Data, and summarize it according to the specifications below:
  
          Specifications: 
          Numbers: Currency to be prefaced like "$x,xxx.xx" other numbers to be prefaced like "x,xxx.xx"
          Format: "Here it is: The current date is: ${year}-${month}-${day}. Bullet Point Summary: bulletpointsummary Paragraph Summary: paragraphsummary."
          Style: Friendly, informative, and indicative of trends.
          Tip: If there is no data in the string, don't just make up data, return the fact that the data is empty.
  
          Question: ${queryString}
          Data: ${shortenedApiCallData}
          `,
          max_tokens: 512,
          temperature: .5,
          stop: "/n",
      })
      return response.data.choices[0].text
      } 
    }

 
module.exports = { fundamentalsStockRequest };
