class APIFeatures {

//      REQ_URL:  /products?keyword=phone&page=2

//    //  ---->this.query
//    // Product.find()

//    this.queryStr
//    // {
//    //   keyword: "phone",
//    //   page: "2"
//     // }

  constructor(query, queryStr = {}) {
    this.query = query;
    this.queryStr = queryStr;
  }


        // {
        //   name: {
        //     $regex: "phone",
        //     $options: "i"
        //   }
        // }
  search() {
    const keyword = this.queryStr.keyword
      ? {
          name: {
            $regex: this.queryStr.keyword,
            $options: "i",  //case insensitive
          },
        }
      : {};

    this.query = this.query.find({ ...keyword });
    return this;
  }


          //   /products?price[gte]=50000&price[lte]=80000
          //   {
          //   price: {
          //     $gte: 50000,
          //     $lte: 80000
          //   }
          // }
  filter() {
    const queryCopy = { ...this.queryStr };

    const removeFields = ["keyword", "limit", "page", "sortBy"];
    removeFields.forEach((el) => delete queryCopy[el]);

    let queryStr = JSON.stringify(queryCopy);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }
  

              // //   /products?sortBy=ratings
              // Product.find(...)
              // .sort({
              //   ratings: -1
              // });
  sort() {
    if (this.queryStr.sortBy) {
      const sortBy = this.queryStr.sortBy.toLowerCase();
      let sortQuery = {};

      if (sortBy === "ratings") {
        sortQuery = { ratings: -1 };
      } else if (sortBy === "reviews") {
        sortQuery = { numOfReviews: -1 };
      }

      this.query = this.query.sort(sortQuery);
    }
    return this;
  }


            // ?page=2 and limit=10
            // this code calculates: const currentPage = 2;
            //                       const skip = 10 * (2 - 1);
            //                       skip = 10;
            // this.query
            //   .limit(10)
            //   .skip(10);
  pagination(resPerPage) {
    const currentPage = Number(this.queryStr.page) || 1;
    const skip = resPerPage * (currentPage - 1);

    this.query = this.query.limit(resPerPage).skip(skip);
    return this;
  }
}

module.exports = APIFeatures;



// GET /products?keyword=phone&price[gte]=50000&sortBy=ratings&page=2
// Product.find({
//   name: {
//     $regex: "phone",
//     $options: "i"
//   },
//   price: {
//     $gte: 50000
//   }
// })
// .sort({
//   ratings: -1
// })
// .limit(10)
// .skip(10);