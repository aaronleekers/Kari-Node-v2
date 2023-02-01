const axios = require('axios');
const { Configuration, OpenAIApi } = require('openai');

  
const orgId = process.env.ORG_ID;
const apiKey = process.env.API_KEY;

// This should be able to answer questions like:
// Compare the stocks TSLA, AAPL, MCD, SPY, and MSFT.
// Compare Ford, General Motors, and Tesla's price performance on January 25, 2023.
// Compare The S&P 500 ETF, Coca Cola, and McDonald's price performance on January 6, 2021.

// openAI auth
  const configuration = new Configuration({
    orgId: orgId,
    apiKey: apiKey,
});
  const openai = new OpenAIApi(configuration);

  // bulkStocks - Potential Arguments Include: stockName(s), date
  async function bulkRequest(queryString){
    // Overall Workflow
    var extractedStocks = await extractStocks(queryString)
    var extractedDate = await extractDate(queryString);
    console.log(extractedDate, extractedStocks);
    var apiLink = await createApiLink(extractedStocks, extractedDate);
    console.log(apiLink);
    var apiCallData = await apiCall(apiLink);
    var summarizedData = await summarizeData(apiCallData);
    return summarizedData;

    async function extractStocks(queryString){
        const response = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: 
            `
            Instructions: extract the company names or stock symbols from the queryString, 
            modify them to be stock symbols instead of company names. 
            Finally, output in the following format: (symbols=S1,S2,S3)

            Ideal inputs and outputs:
            (I: "Compare AAPL, TSLA, and Microsoft's price performance on January 25, 2023.", O: "symbols=AAPL,TSLA,MSFT)
            (I: "Compare Ford, General Motors, and Rivian's price performance on January 25, 2023.", O: "symbols=F,GM,RIVN)
            (I: "Compare Nike, McDonalds, The S&P500 ETF, and Coke's price performance on January 25, 2023.", O: "symbols=NKE,MCD,SPY,COKE)

            queryString: ${queryString}
            `,
            max_tokens: 1024,
            stop: "/n"
        })
        return response.data.choices[0].text;
    }
    async function extractDate(queryString){
        const response = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: 
            `
            Instructions: extract the date from the queryString. If there is no date present, return "N/A". Format the date into YYYY-MM-DD.
            Finally, output in the following format: "yyyy-mm-dd"

            Ideal inputs and outputs:
            (I: "Compare AAPL, TSLA, and Microsoft's price performance on January 25, 2023.", O: "2023-01-25")
            (I: "Compare Raytheon, SPY, and Chase's price performance on January 6, 2021.", O: "2021-01-06")
            (I: "Compare AAPL, TSLA, and Microsoft's price performance on March 13, 2020.", O: "2020-03-13")

            queryString: ${queryString}
            `,
            max_tokens: 1024,
            stop: "/n"
        })
        return response.data.choices[0].text;
    }

    // createApiLink function
    async function createApiLink(extractedDate, extractedStocks) {
        const apiLink = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: `
            Please help me create a link to access financial data for a specific stock by replacing the stock name, and other variables in the following format:
            apiLink: https://www.eodhistoricaldata.com/api/eod-bulk-last-day/US?api_token=63a2477acc2587.58203009&fmt=json&filter=extended&symbols=(extractedStocks)
            - The (extractedStocks) area should be replaced with the contents within extractedStocks below.
            - If the extractedDate is not "N/A" add &date=(extractedDate) to the end of the link. Only add date to link if there is date present, otherwise add nothing.
            - Respond in the format of: "apiLink: (apilink)"
            
            extractedStocks: ${extractedStocks}.
            extractedDate: ${extractedDate}.
                       `,
            max_tokens: 1024,
            temperature: .3,
            stop: "/n",
        });
        return apiLink.data.choices[0].text;
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
  // summarizeData function
  async function summarizeData(apiCallData) {
    const apiCallDataString = JSON.stringify(apiCallData)
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
        Content: Bullet point summary of highlights, followed by paragraph summary of highlights.
        Format: "Here it is: The current date is: ${year}-${month}-${day}. Bullet Point Summary: bulletpointsummary Paragraph Summary: paragraphsummary. Thanks for asking your question, to get a more in-depth summary of the information, visit www.kariai.xyz"
        Style: Friendly, informative, and indicative of trends.
        Tip: If there is no data in the string, don't just make up data, return the fact that the data is empty.

        Data: ${apiCallDataString}
        `,
        max_tokens: 1500,
        temperature: .5,
        stop: "/n",
    })
    return response.data.choices[0].text
    } 
  }

  module.exports = { bulkRequest }