import PageViewModel from "../../models/pageview.model.js";


export const GetPageViews = async (req, res) => {
  try {
    const pageViews = await PageViewModel.find().sort({ viewCount: -1 });

    return res.status(200).json({
      success: true,
      message: "Page views fetched successfully",
      data: pageViews,
    });
  } catch (error) {
    console.error("Error in GetPageViews:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching page views",
    });
  }
};
