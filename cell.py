Architectural overview of Pub/Sub 

bookmark_border
Pub/Sub is an asynchronous messaging service designed to be highly reliable and scalable. The service is built on a core Google infrastructure component that many Google products have relied upon for over a decade. Google products including Ads, Search and Gmail use this infrastructure to send over 500 million messages per second, totaling over 1TB/s of data. This article describes the salient design features that enables Pub/Sub to provide this type of scale reliably.

Judging Performance of a Messaging Service
A messaging service like Pub/Sub can be judged on its performance in three aspects: scalability, availability, and latency. These three factors are often at odds with each other, requiring compromises on one to improve the other two.

The terms "scalability," “availability,” and “latency” can refer to different properties of a system, so the following sections describe how they are defined in Pub/Sub.

Scalability
A scalable service should be able to 
