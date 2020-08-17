```json
{
  "date": "2020.08.16 08:45",
  "tags": ["GOLAN图片搜索"],
  "description":"如果你是一名设计师，有可能需要将几万张图片里面的文字或者一些关键内容替换成其他文字或者图片内容，或者找出这些图片中存在某些内容的特殊图片，如何快速的用程序来帮我完成这些事情呢？还记得你写 JAVASCRIPT 的时候使用的字符串方法 replace 和 indexOf 吗？so 相应的实现了这两个方法我们就能处理这些图片。😄"
}
```

> 如果你是一名设计师，有可能需要将几万张图片里面的文字或者一些关键内容替换成其他文字或者图片内容，或者找出这些图片中存在某些内容的特殊图片，如何快速的用程序来帮我完成这些事情呢？还记得你写 JAVASCRIPT 的时候使用的字符串方法 replace 和 indexOf 吗？so 相应的实现了这两个方法我们就能处理这些图片。

## 设计接口

在开发之前我们先想清楚对外提供的接口

- `func (p *Picture) SetCompareAccuracy(compareAccuracy int)` 设置图片在查找过程找到图片后对比的精确度，1代表100%完全吻合。
- `func (p *Picture) SearchPic(searchPic *Picture) (bool, image.Rectangle)` 在大图中查找小图出现的一个区域
- `func (p *Picture) SearchAllPic(searchPic *Picture) (bool, []image.Rectangle)` 在大图中查找小图出现的多个区域
- `func (p *Picture) Replace(searchPic *Picture, replacer *Picture) (image.Image, error)` 在大图中查找并替换小图的一个区域
- `func (p *Picture) ReplaceAll(searchPic *Picture, replacer *Picture) (image.Image, error)`在大图中查找并替换小图的多个区域


## 结构体和初始化

```go

const defaultCompareAccuracy = 10 //查找图片的精确值，默认查找图片平均有10分之一的像素对应即认为两部分图片一样。

type Picture struct {
	Img             image.Image
	Width           int
	Height          int
	Path            string
	CompareAccuracy int
}

func NewJpeg(path string) (*Picture, error) {

	read, err := os.Open(path)
	if err != nil {
		return &Picture{}, err
	}
	defer read.Close()

	img, err := jpeg.Decode(read)
	if err != nil {
		return &Picture{}, err
	}

	return newPic(img, path), nil
}

func NewPng(path string) (*Picture, error) {

	read, err := os.Open(path)
	if err != nil {
		return &Picture{}, err
	}
	defer read.Close()

	img, err := png.Decode(read)
	if err != nil {
		return &Picture{}, err
	}

	return newPic(img, path), nil
}
func newPic(img image.Image, path string) *Picture {

	rectangle := img.Bounds()
	w := rectangle.Max.X
	h := rectangle.Max.Y
	return &Picture{
		Img:             img,
		Width:           w,
		Height:          h,
		Path:            path,
		CompareAccuracy: defaultCompareAccuracy,
	}
}
```
## 方法

```go
func (p *Picture) SetCompareAccuracy(compareAccuracy int) {
	p.CompareAccuracy = compareAccuracy
}

func (p *Picture) SearchPic(searchPic *Picture) (bool, image.Rectangle) {
	rectangles := seekPos(p, searchPic, true)
	if len(rectangles) == 0 {
		return false, image.Rectangle{}
	}
	return true, rectangles[0]
}

func (p *Picture) SearchAllPic(searchPic *Picture) (bool, []image.Rectangle) {
	rectangles := seekPos(p, searchPic, false)
	if len(rectangles) == 0 {
		return false, rectangles
	}
	return true, rectangles
}

func (p *Picture) Replace(searchPic *Picture, replacer *Picture) (image.Image, error) {

	if searchPic.Width != replacer.Width || searchPic.Height != replacer.Height {
		return p.Img, errors.New("查找和替换的图片大小不一致")
	}

	isExist, rectangle := p.SearchPic(searchPic)
	if !isExist {
		return p.Img, errors.New("在" + p.Path + "并未发现" + searchPic.Path)
	}

	dst := p.Img
	if dst, ok := dst.(draw.Image); ok {
		draw.Draw(dst, rectangle, replacer.Img, image.Point{}, draw.Src)
	}
	return dst, nil
}

func (p *Picture) ReplaceAll(searchPic *Picture, replacer *Picture) (image.Image, error) {

	if searchPic.Width != replacer.Width || searchPic.Height != replacer.Height {
		return p.Img, errors.New("查找和替换的图片大小不一致")
	}

	isExist, rectangles := p.SearchAllPic(searchPic)
	if !isExist {
		return p.Img, errors.New("在" + p.Path + "并未发现" + searchPic.Path)
	}

	dst := p.Img
	if dst, ok := dst.(draw.Image); ok {
		for _,rectangle := range rectangles{
			draw.Draw(dst, rectangle, replacer.Img, image.Point{}, draw.Src)
		}
	}
	return dst, nil
}

func scanAreaOk(intX, intY int, p, searchPic *Picture) bool {
	h :=  searchPic.Height - 1
	w := searchPic.Width - 1

	if p.CompareAccuracy < 1 || h < p.CompareAccuracy || w < p.CompareAccuracy{
		p.SetCompareAccuracy(1)
	}

	for y := 0; y <= searchPic.Height-1; y += p.CompareAccuracy {
		for x := 0; x <= searchPic.Width-1; x += p.CompareAccuracy {
			if searchPic.Img.At(x, y) != p.Img.At(intX+x, intY+y) {
				return false
			}
		}
	}
	return true
}

func seekPos(p *Picture, searchPic *Picture, searchOnce bool) []image.Rectangle {
	var rectangles []image.Rectangle
	if searchPic.Width > p.Width || searchPic.Height > p.Height {
		return rectangles
	}
	for y := 0; y <= (p.Height - searchPic.Height); y++ {
		for x := 0; x <= (p.Width - searchPic.Width); x++ {
			if searchPic.Img.At(0, 0) != p.Img.At(x, y) ||
				searchPic.Img.At(searchPic.Width - 1, 0) != p.Img.At(x + searchPic.Width - 1, y) ||
				searchPic.Img.At(searchPic.Width - 1, searchPic.Height - 1) != p.Img.At(x + searchPic.Width - 1, y + searchPic.Height - 1) ||
				searchPic.Img.At(0, searchPic.Height - 1) != p.Img.At(x, y + searchPic.Height - 1) { //四个角只要有一个颜色对应不上直接跳到下一次
				continue
			}

			if !scanAreaOk(x, y, p, searchPic) { //四个角对上了在扫描区域，不成功直接下一次，
				continue
			}

			min := image.Point{X: x, Y: y}
			max := image.Point{X: x + searchPic.Width, Y: y + searchPic.Height}
			rectangles = append(rectangles, image.Rectangle{Min: min, Max: max})
			if searchOnce {
				return rectangles
			}
		}
	}
	return rectangles
}

```

## 总结

关键的就是 seekPos 和 scanAreaOk 两个内部方法了，一个负责查找位置并给出矩形区域，另外一个是扫描矩形是否和查找的图片一样，有了这几个关键的函数，那我们就可以基于此遍历所有目录，将100张图片为一组的进行并行处理，根据上面的方法，我们也很清楚的知道一些规则。

- 如果被搜索的图片 searchPic 的四个角都是白色的区域，这样就容易触发 scanAreaOk 函数，会让程序处理花费更多的时间，因此如果被搜索的图片四个角都有内容的话则会大大缩短处理时间。
- ReplaceAll 函数的效率比 Replace 差，因为 Replace 只会执行一次搜索，发现立即返回。
- 如果被搜索的图片内容能用眼睛一眼就能确定，或者说很明确，不会和其他不相关的内容有一些细微的差别，那么可以通过函数 SetCompareAccuracy 将 CompareAccuracy 的值设置大一点，如默认 searchPic 图片里面平均有10/1 个像素点能一一对应，那么就认为它找到了图片，对于大像素的图片，我们甚至可以设置为 50 甚至到 100，这样能让处理时间大大缩短。


让我浪费时间的地方是对于 CompareAccuracy 的值处理，我一度怀疑我是不是做错了，CompareAccuracy 是对比的准确度。这个值是用来提高函数处理效率的，
被我描述为"查找图片的精确值，默认查找图片平均有10分之一的像素对应即认为两部分图片一样",他被使用在 scanAreaOk 函数，如果一个图片有1000个像素，如果 CompareAccuracy 值是 10 的话，那么我希望他在这 1000 个像素里面 平均的取 10/1 个像素来比较，总共取 1000/10 个点， y += p.CompareAccuracy 最后肯定是被执行 1000/10 次就超出  y <= searchPic.Height-1 了，因此，这一描述是对的。

这个逻辑不难，却花费了我一些时间，看来我需要补充算法的一些知识点了 😥