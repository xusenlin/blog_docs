# 原理



现在像 openai 和 ChatGLM2-6B 等大模型语言的对话上下文是有 token 限制的，即使是 gpt 4 目前最好的模型好像也是 32k，对于我们的本地资料库，肯定是需要通过语义搜索出相关的段落，将相关段落和用户的提问一起给到语言模型去回答。例如：

```
`
	${content}。
	根据以上信息，请回答下面的问题：Q: ${question}
`
```

那么怎么才能利用模型来做语义搜索呢？

首先获得所有资料库句子的语义向量(Embedding)，将用户的提问也转换为语义向量，通过计算问题的向量和资料库所有向量的余弦相似度，从而找到语义相似的多条资料，在利用语言大模型的上下文推理逻辑来精准回答用户问题。

这里的搜索并不是像以前一样简简单单的分词匹配，他也是利用sentence-similarity(句子相似度)相关的预训练模型来完成的。

#SentenceSimilarity Models & Embedding

openai 提供了一个接口可以直接生成Embedding，它使用的是 openai-ada-002 模型。我将当前这个博客所有的md文档试了一下，慢不说，还消耗了我的0.2美元。所以我们肯定要使用开源的，下面是部分模型对比。

|                | 参数数量 | 维度 | 中文 | 英文 | s2s  | s2p  | s2c  | 开源 | 兼容性 | s2s Acc    | s2p ndcg@10 |
| -------------- | -------- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ------ | ---------- | ----------- |
| m3e-small      | 24M      | 512  | 是   | 否   | 是   | 否   | 否   | 是   | 优     | 0.5834     | 0.7262      |
| m3e-base       | 110M     | 768  | 是   | 是   | 是   | 是   | 否   | 是   | 优     | **0.6157** | **0.8004**  |
| text2vec       | 110M     | 768  | 是   | 否   | 是   | 否   | 否   | 是   | 优     | 0.5755     | 0.6346      |
| openai-ada-002 | 未知     | 1536 | 是   | 是   | 是   | 是   | 是   | 否   | 优     | 0.5956     | 0.7786      |

现在在huggingface排第一的是GanymedeNil/text2vec-large-chinese，但是我更建议使用m3e-base，text2vec 还不支持英文，注意：m3e-base还不支持代码检索。

要使用这些模型库，我们需要安装sentence-transformers，它是一个用于生成句子嵌入（sentence embeddings）的Python库，它基于预训练模型，并提供了简单易用的接口来计算句子之间的语义相似度和进行句子级别的语义搜索。

sentence-transformers使用了两个主要的技术来计算句子嵌入：

1. 序列编码器（Sequence Encoder）：使用预训练的模型来将句子编码成固定长度的向量表示。这些模型可以通过逐层预训练和微调学习到句子的上下文和语义信息。
2. 相似性度量：使用余弦相似度或欧几里得距离等度量方法来计算两个句子之间的相似度。

```python
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('moka-ai/m3e-base')

sentences = ['我有一只哈基米','The quick brown fox jumps over the lazy dog.']
sentence_embeddings = model.encode(sentences)

for sentence, embedding in zip(sentences, sentence_embeddings):
    print("Sentence:", sentence)
    print("Embedding:", embedding)
    print("")
```

输出：

```shell
Sentence: 我有一只哈基米
Embedding: [ 1.14187300e+00  9.20354187e-01  9.80630457e-01 -5.97655118e-01
  3.48968148e-01 -1.51562333e+00  4.05094117e-01  8.58210683e-01
 -3.41794074e-01 -8.43169689e-02  1.09149730e+00  2.21264869e-01
  3.20232630e-01 -1.35299790e+00 -1.51560438e+00 -1.13328314e+00 ...]
  
  ...
```

这个库还提供了搜索和计算余弦距离等工具函数，甚至是图片和文本都可以一起嵌入计算，当然得模型支持。

https://huggingface.co/moka-ai/m3e-base

https://github.com/UKPLab/sentence-transformers

# Llama Index

如果我们手动将各种文档（text、pdf、word、sql）分好句子段落，然后都生成Embedding，在保存起来是一件很繁琐的事情，所以可以使用Llama Index快速帮我们完成这些工作。

https://github.com/jerryjliu/llama_index