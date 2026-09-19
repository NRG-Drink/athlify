import { Button, HStack } from '@chakra-ui/react'

const DemoChakra = () => {
  return (
    <HStack>
      <Button onClick={() => console.log('Button clicked')}>Click me</Button>
      <Button>Click me</Button>
    </HStack>
  )
}

export default DemoChakra
